"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Image as ImageIcon, Video } from "lucide-react";

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

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  type: "image" | "video";
  onSelect: (media: { id: string; url: string; type: string; alt?: string }) => void;
}

export default function MediaPickerModal({
  open,
  onClose,
  type,
  onSelect,
}: MediaPickerModalProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = type === "image" ? "image" : "video";
      const response = await fetch(`/api/media?type=${typeParam}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Medien");
      }

      const data = await response.json();
      setMedia(data);
    } catch (err: any) {
      console.error("Fehler beim Laden der Medien:", err);
      setError(err.message || "Fehler beim Laden der Medien");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (open) {
      void (async () => {
        await loadMedia();
      })();
    }
  }, [open, loadMedia]);

  const handleSelect = (item: Media) => {
    onSelect({
      id: item.id,
      url: item.url,
      type: item.type,
      alt: item.title || undefined,
    });
    onClose();
  };

  const filteredMedia = media.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.fileName.toLowerCase().includes(query) ||
      (item.title && item.title.toLowerCase().includes(query))
    );
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "image" ? "Bild auswählen" : "Video auswählen"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Lädt...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">{error}</div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-center">
                <p className="text-lg mb-2">
                  {type === "image" ? "Keine Bilder gefunden" : "Keine Videos gefunden"}
                </p>
                <p className="text-sm">Lade zuerst Medien hoch</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-rose-500 transition-colors"
                >
                  {item.type === "IMAGE" ? (
                    <img
                      src={item.url}
                      alt={item.title || item.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                      {item.fileName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

