"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signSchema, type SignFormData } from "@/lib/validations/signs";
import MediaPicker from "@/components/media/media-picker";

interface Tag {
  id: string;
  slug: string;
  name: string;
}

interface Sign {
  id: string;
  slug: string;
  title: string;
  description: string;
  howTo?: string | null;
  tips?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED";
  tags: Tag[];
}

interface SignFormProps {
  mode: "create" | "edit";
  initialData?: Sign & { tagNames?: string[] };
}

export default function SignForm({ mode, initialData }: SignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [pickerField, setPickerField] = useState<"imageUrl" | "videoUrl">("imageUrl");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignFormData>({
    resolver: zodResolver(signSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      howTo: initialData?.howTo || "",
      tips: initialData?.tips || "",
      videoUrl: initialData?.videoUrl || "",
      imageUrl: initialData?.imageUrl || "",
      status: initialData?.status || "DRAFT",
      tagNames: initialData?.tagNames || [],
    },
  });

  const tagNames = watch("tagNames") || [];
  const imageUrl = watch("imageUrl");
  const videoUrl = watch("videoUrl");

  const handleOpenPicker = (type: "IMAGE" | "VIDEO", field: "imageUrl" | "videoUrl") => {
    setPickerType(type);
    setPickerField(field);
    setPickerOpen(true);
  };

  const handleSelectMedia = (url: string) => {
    setValue(pickerField, url);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    const currentTags = tagNames || [];
    if (!currentTags.includes(trimmed)) {
      setValue("tagNames", [...currentTags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = tagNames || [];
    setValue(
      "tagNames",
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  const onSubmit = async (data: SignFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = mode === "create" ? "/api/signs" : `/api/signs/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      const result = await response.json();
      router.push(`/admin/signs/${result.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Titel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titel *
          </label>
          <input
            {...register("title")}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="z.B. Essen"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Beschreibung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beschreibung *
          </label>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Beschreibung des Zeichens..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* How To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            So machst du das Zeichen (optional)
          </label>
          <textarea
            {...register("howTo")}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Anleitung zum Ausführen des Zeichens..."
          />
        </div>

        {/* Tips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipps (optional)
          </label>
          <textarea
            {...register("tips")}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="z.B. Ab wann sinnvoll, häufige Fehler..."
          />
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Video-URL (optional)
          </label>
          <div className="flex gap-2">
            <input
              {...register("videoUrl")}
              type="url"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="https://... oder aus Medien auswählen"
            />
            <button
              type="button"
              onClick={() => handleOpenPicker("VIDEO", "videoUrl")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              📹 Aus Medien
            </button>
          </div>
          {videoUrl && (
            <div className="mt-2">
              <video
                src={videoUrl}
                controls
                className="max-w-full max-h-48 rounded-lg border border-gray-200"
              >
                Dein Browser unterstützt das Video-Element nicht.
              </video>
            </div>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bild-URL (optional)
          </label>
          <div className="flex gap-2">
            <input
              {...register("imageUrl")}
              type="url"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="https://... oder aus Medien auswählen"
            />
            <button
              type="button"
              onClick={() => handleOpenPicker("IMAGE", "imageUrl")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              🖼️ Aus Medien
            </button>
          </div>
          {imageUrl && (
            <div className="mt-2">
              <img
                src={imageUrl}
                alt="Vorschau"
                className="max-w-full max-h-48 rounded-lg border border-gray-200 object-contain"
              />
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            {...register("status")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="DRAFT">Entwurf</option>
            <option value="PUBLISHED">Veröffentlicht</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Tag hinzufügen (Enter drücken)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Hinzufügen
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagNames.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Wird gespeichert..." : mode === "create" ? "Erstellen" : "Speichern"}
        </button>
      </div>

      {/* Media Picker */}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type={pickerType}
        onSelect={handleSelectMedia}
      />
    </form>
  );
}

