"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getOptimizationPreview, type OptimizationPreview } from "@/lib/image-web-optimization";

interface ImageOptimizePromptModalProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onOptimize: (blob: Blob, mimeType: "image/webp") => void;
  onUseOriginal: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageOptimizePromptModal({
  open,
  file,
  onClose,
  onOptimize,
  onUseOriginal,
}: ImageOptimizePromptModalProps) {
  const [preview, setPreview] = useState<OptimizationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setPreview(null);
      setError(null);
      setLoading(false);
      return;
    }
    let revoked = false;
    setLoading(true);
    setError(null);
    getOptimizationPreview(file)
      .then((p) => {
        if (!revoked) {
          previewUrlRef.current = p.previewUrl;
          setPreview(p);
          setLoading(false);
        } else {
          URL.revokeObjectURL(p.previewUrl);
        }
      })
      .catch((err) => {
        if (!revoked) {
          setError(err.message || "Optimierung nicht verfügbar");
          setPreview(null);
          setLoading(false);
        }
      });
    return () => {
      revoked = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [open, file]);

  const handleClose = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const originalSize = file?.size ?? 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimize-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="optimize-modal-title" className="sr-only">
          Bild für Web optimieren?
        </h2>
        <div className="p-4 border-b border-gray-200">
          <p className="text-gray-800 text-sm">
            Dieses Bild ist für die Webanzeige sehr groß (
            {formatBytes(originalSize)}, {file?.name}). Soll es für das Web
            optimiert werden? Es wird als WebP gespeichert.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-6 text-gray-500 text-sm">
              Vorschau wird erstellt…
            </div>
          )}
          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mb-4">
              {error}
            </div>
          )}
          {preview && !error && (
            <>
              <div className="max-h-[40vh] max-w-full overflow-hidden rounded bg-gray-100 flex items-center justify-center mb-4">
                <img
                  src={preview.previewUrl}
                  alt="Vorschau"
                  className="w-full h-full object-contain max-h-[40vh]"
                />
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Aktuell: {formatBytes(originalSize)}</p>
                <p>Nach Optimierung (WebP): ca. {formatBytes(preview.estimatedSize)}</p>
                <p>Maße nach Optimierung: {preview.width}×{preview.height} px</p>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              handleClose();
              onUseOriginal();
            }}
            className="px-4 py-2 text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Original hochladen
          </button>
          <button
            type="button"
            onClick={() => {
              if (preview) {
                handleClose();
                onOptimize(preview.optimizedBlob, preview.mimeType);
              }
            }}
            disabled={!preview || loading}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Optimieren und hochladen
          </button>
        </div>
      </div>
    </div>
  );
}
