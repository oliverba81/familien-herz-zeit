"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { isImageTooLargeForWeb } from "@/lib/image-web-optimization";
import ImageOptimizePromptModal from "./image-optimize-prompt-modal";

export default function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizeModalFile, setOptimizeModalFile] = useState<File | null>(null);
  const [optimizeModalTitle, setOptimizeModalTitle] = useState<string>("");

  const doUpload = async (file: File, title: string) => {
    setUploading(true);
    setError(null);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (title) uploadFormData.append("title", title);
      const response = await fetch("/api/media", {
        method: "POST",
        body: uploadFormData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload fehlgeschlagen");
      }
      setUploading(false);
      if (formRef.current) formRef.current.reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Fehler beim Hochladen");
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = formRef.current;
    if (!form) {
      setError("Formular nicht gefunden");
      return;
    }

    const formData = new FormData(form);
    const fileInput = form.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    if (!fileInput?.files?.[0]) {
      setError("Bitte wählen Sie eine Datei aus");
      return;
    }

    const file = fileInput.files[0];
    const title = (formData.get("title") as string) || "";

    if (file.type.startsWith("image/")) {
      try {
        const tooLarge = await isImageTooLargeForWeb(file);
        if (tooLarge) {
          setOptimizeModalFile(file);
          setOptimizeModalTitle(title);
          return;
        }
      } catch {
        // Bei Fehler (z. B. SVG) direkt hochladen
      }
    }

    await doUpload(file, title);
  };

  const handleOptimizeModalOptimize = (blob: Blob, _mimeType: "image/webp") => {
    const orig = optimizeModalFile;
    if (!orig) return;
    const base = orig.name.replace(/\.[^.]+$/, "") || "image";
    const file = new File([blob], `${base}.webp`, { type: "image/webp" });
    setOptimizeModalFile(null);
    const title = optimizeModalTitle;
    setOptimizeModalTitle("");
    doUpload(file, title);
  };

  const handleOptimizeModalUseOriginal = () => {
    const orig = optimizeModalFile;
    if (!orig) return;
    const title = optimizeModalTitle;
    setOptimizeModalFile(null);
    setOptimizeModalTitle("");
    doUpload(orig, title);
  };

  const handleOptimizeModalClose = () => {
    setOptimizeModalFile(null);
    setOptimizeModalTitle("");
  };

  return (
    <>
      <ImageOptimizePromptModal
        open={!!optimizeModalFile}
        file={optimizeModalFile}
        onClose={handleOptimizeModalClose}
        onOptimize={handleOptimizeModalOptimize}
        onUseOriginal={handleOptimizeModalUseOriginal}
      />
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Neues Medium hochladen</h3>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Datei
        </label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          disabled={uploading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Bilder: max. 10MB | Videos: max. 200MB
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titel (optional)
        </label>
        <input
          type="text"
          name="title"
          placeholder="z.B. Produktbild 1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          disabled={uploading}
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Wird hochgeladen..." : "Hochladen"}
      </button>
    </form>
    </>
  );
}

