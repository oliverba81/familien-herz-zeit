"use client";

import { useState, useEffect, useRef } from "react";
import { getVideoDisplayUrl } from "@/lib/video/url-helper";
import { isImageTooLargeForWeb } from "@/lib/image-web-optimization";
import ImageOptimizePromptModal from "./image-optimize-prompt-modal";

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

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  type: "IMAGE" | "VIDEO";
  onSelect: (url: string) => void;
}

export default function MediaPicker({
  open,
  onClose,
  type,
  onSelect,
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [optimizeModalFile, setOptimizeModalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showUploadRef = useRef(false);

  useEffect(() => {
    if (open) {
      loadMedia();
      // Reset showUpload when dialog opens
      showUploadRef.current = false;
      setShowUpload(false);
    }
  }, [open, type]);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = type === "IMAGE" ? "image" : "video";
      const response = await fetch(`/api/media?type=${typeParam}`, {
        credentials: "include", // Wichtig: Session-Cookies mitsenden
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("API Error Response:", errorData);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("📦 Geladene Medien:", data.length, "Items");
      data.forEach((item: Media) => {
        console.log(`  - ${item.type}: ${item.fileName} → ${item.url}`);
      });
      setMedia(data);
    } catch (err: any) {
      console.error("Fehler beim Laden der Medien:", err);
      setError(err.message || "Fehler beim Laden der Medien");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setFileDialogOpen(false);
    const file = e.target.files?.[0];
    if (!file) {
      setFileDialogOpen(false);
      return;
    }

    // Prüfe Dateityp
    const mimeType = file.type;
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");
    
    if (type === "IMAGE" && !isImage) {
      setUploadError("Bitte wähle ein Bild aus");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    if (type === "VIDEO" && !isVideo) {
      setUploadError("Bitte wähle ein Video aus");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (type === "IMAGE" && isImage) {
      try {
        const tooLarge = await isImageTooLargeForWeb(file);
        if (tooLarge) {
          setUploadError(null);
          setOptimizeModalFile(file);
          return;
        }
      } catch {
        // Bei Fehler (z. B. SVG) direkt hochladen
      }
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload fehlgeschlagen");
      }

      const uploadedMedia = await response.json();
      
      // Wähle das hochgeladene Medium automatisch aus
      onSelect(uploadedMedia.url);
      
      // Lade Medienliste neu (im Hintergrund, ohne zu warten)
      loadMedia().catch(console.error);
      
      // Schließe nach kurzer Verzögerung, damit Erfolg sichtbar ist
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err: any) {
      setUploadError(err.message || "Fehler beim Hochladen");
      setUploading(false);
      // Reset file input bei Fehler
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const doUpload = async (fileToUpload: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload fehlgeschlagen");
      }
      const uploadedMedia = await response.json();
      setUploading(false);
      setOptimizeModalFile(null);
      onSelect(uploadedMedia.url);
      loadMedia().catch(console.error);
      setTimeout(() => onClose(), 300);
    } catch (err: any) {
      setUploadError(err.message || "Fehler beim Hochladen");
      setUploading(false);
    }
  };

  const handleOptimizeModalOptimize = (blob: Blob, _mimeType: "image/webp") => {
    const orig = optimizeModalFile;
    if (!orig) return;
    const base = orig.name.replace(/\.[^.]+$/, "") || "image";
    const file = new File([blob], `${base}.webp`, { type: "image/webp" });
    setOptimizeModalFile(null);
    doUpload(file);
  };

  const handleOptimizeModalUseOriginal = () => {
    const orig = optimizeModalFile;
    if (!orig) return;
    setOptimizeModalFile(null);
    doUpload(orig);
  };

  const handleOptimizeModalClose = () => {
    setOptimizeModalFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Schließe nur wenn auf Hintergrund geklickt wird, nicht während Upload, wenn Upload-Bereich offen ist oder wenn Datei-Dialog offen ist
    if (e.target === e.currentTarget && !uploading && !showUploadRef.current && !fileDialogOpen) {
      onClose();
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Schließe nur wenn auf Hintergrund geklickt wird, nicht während Upload, wenn Upload-Bereich offen ist oder wenn Datei-Dialog offen ist
    if (e.target === e.currentTarget && !uploading && !showUploadRef.current && !fileDialogOpen) {
      onClose();
    }
  };

  const handleToggleUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // Setze Ref sofort, bevor State-Update
    const newValue = !showUpload;
    showUploadRef.current = newValue;
    setShowUpload(newValue);
  };

  return (
    <>
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropMouseDown}
    >
      <ImageOptimizePromptModal
        open={!!optimizeModalFile}
        file={optimizeModalFile}
        onClose={handleOptimizeModalClose}
        onOptimize={handleOptimizeModalOptimize}
        onUseOriginal={handleOptimizeModalUseOriginal}
      />
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex justify-between items-center p-4 border-b border-gray-200"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "IMAGE" ? "Bild auswählen" : "Video auswählen"}
          </h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleToggleUpload}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="px-3 py-1 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              {showUpload ? "Abbrechen" : "+ Hochladen"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Erlaube Schließen immer, außer während des tatsächlichen Uploads
                if (!uploading) {
                  onClose();
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              disabled={uploading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Upload-Bereich */}
          {showUpload && (
            <div 
              className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Neues {type === "IMAGE" ? "Bild" : "Video"} hochladen
              </h3>
              {uploadError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {uploadError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={type === "IMAGE" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm"}
                  onChange={handleFileUpload}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileDialogOpen(true);
                  }}
                  onFocus={(e) => {
                    e.stopPropagation();
                    setFileDialogOpen(true);
                  }}
                  onBlur={() => {
                    // Warte kurz, bevor wir fileDialogOpen zurücksetzen, falls der Dialog noch offen ist
                    setTimeout(() => {
                      setFileDialogOpen(false);
                    }, 200);
                  }}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 disabled:opacity-50 cursor-pointer bg-white hover:bg-gray-50 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileDialogOpen(true);
                  }}
                >
                  {uploading ? "Wird hochgeladen..." : "Datei auswählen"}
                </label>
                {uploading && (
                  <div className="flex items-center px-4 text-sm text-gray-600">
                    Wird hochgeladen...
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {type === "IMAGE" ? "Bilder: max. 10MB" : "Videos: max. 200MB"}
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              Wird geladen...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && media.length === 0 && !showUpload && (
            <div className="text-center py-8 text-gray-500">
              Keine Medien gefunden. Lade zuerst ein Medium hoch.
            </div>
          )}

          {!loading && !error && media.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className="relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:ring-2 hover:ring-rose-500 transition-all group"
                >
                  <div className="aspect-square bg-white flex items-center justify-center overflow-hidden relative border border-gray-200">
                    {item.type === "IMAGE" ? (
                      <img
                        src={item.url}
                        alt={item.title || item.fileName}
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                        loading="lazy"
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log("✅ Bild erfolgreich geladen:", item.url, "→ Natural size:", img.naturalWidth, "x", img.naturalHeight, "→ Display size:", img.width, "x", img.height);
                        }}
                        onError={(e) => {
                          console.error("❌ Fehler beim Laden des Bildes:", item.url, item);
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="text-gray-400 text-xs text-center p-2">Bild konnte nicht geladen werden<br/>${item.fileName}<br/><span class="text-[10px] break-all">${item.url}</span></div>`;
                          }
                        }}
                      />
                    ) : (
                      <video
                        src={getVideoDisplayUrl(item.url)}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )}
                    {/* Overlay nur beim Hover */}
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity">
                        Auswählen
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t border-gray-200 flex justify-end"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!uploading && !fileDialogOpen) {
                onClose();
              }
            }}
            disabled={uploading || fileDialogOpen}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Upload läuft..." : fileDialogOpen ? "Datei auswählen..." : "Abbrechen"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

