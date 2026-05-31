"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Media {
  id: string;
  type: "IMAGE" | "VIDEO";
  title: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}

interface MediaGridProps {
  media: Media[];
  filter?: "all" | "image" | "video";
  onFilterChange?: (filter: "all" | "image" | "video") => void;
}

// Button für jedes Bild anzeigen, das noch kein WebP ist (API prüft danach ob Umwandlung möglich).
// type/mimeType case-insensitv, damit abweichende DB-Werte (z. B. "Image", "IMAGE/WEBP") nicht den Button verstecken.
function canConvertToWebP(item: Media): boolean {
  const type = String(item?.type ?? "").toUpperCase();
  const mime = String(item?.mimeType ?? "").toLowerCase();
  if (type !== "IMAGE") return false;
  if (mime === "image/webp") return false;
  return true;
}

export default function MediaGrid({ media, filter = "all", onFilterChange }: MediaGridProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(url);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      // Fallback: URL anzeigen
      alert(`URL: ${fullUrl}`);
    }
  };

  const handleConvertToWebP = async (id: string) => {
    setConverting(id);
    try {
      const response = await fetch(`/api/media/${id}/convert-webp`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Umwandlung fehlgeschlagen");
      }

      router.refresh();
    } catch (err: unknown) {
      alert(`Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Möchten Sie "${fileName}" wirklich löschen?`)) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      router.refresh();
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const filteredMedia = filter === "all" 
    ? media 
    : filter === "image" 
    ? media.filter(m => m.type === "IMAGE")
    : media.filter(m => m.type === "VIDEO");

  if (filteredMedia.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>Keine Medien gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onFilterChange && (
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "all"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => onFilterChange("image")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "image"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bilder
          </button>
          <button
            onClick={() => onFilterChange("video")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "video"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Videos
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
              {item.type === "IMAGE" ? (
                <img
                  src={item.url}
                  alt={item.title || item.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-xs font-medium text-gray-900 truncate">
                {item.title || item.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(item.size)} • {formatDate(item.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {canConvertToWebP(item) && (
                  <button
                    onClick={() => handleConvertToWebP(item.id)}
                    disabled={converting === item.id}
                    className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 disabled:opacity-50"
                  >
                    {converting === item.id ? "..." : "In WebP umwandeln"}
                  </button>
                )}
                <button
                  onClick={() => handleCopyUrl(item.url)}
                  className="flex-1 min-w-0 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  disabled={copySuccess === item.url}
                >
                  {copySuccess === item.url ? "✓ Kopiert" : "URL"}
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.fileName)}
                  disabled={deleting === item.id}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                >
                  {deleting === item.id ? "..." : "Löschen"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

