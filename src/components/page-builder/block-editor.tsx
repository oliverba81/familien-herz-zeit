"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Block, BlockType } from "@/lib/page-builder/types";
import MediaPickerModal from "@/components/media/media-picker-modal";
import { createBlock } from "@/lib/page-builder/templates";
import TinyMCEBlockEditor from "@/components/page-builder/tinymce-block-editor";
import { createBlockId } from "@/lib/page-builder/ids";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface BlockEditorProps {
  block: Block | null;
  onChange: (block: Block) => void;
}

export default function BlockEditor({ block, onChange }: BlockEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"image" | "video">("image");
  const [textEditorModalOpen, setTextEditorModalOpen] = useState(false);
  const [richTextEditorModalOpen, setRichTextEditorModalOpen] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  if (!block) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>Wähle einen Block aus, um ihn zu bearbeiten.</p>
      </div>
    );
  }

  const updateData = (updates: Record<string, any>) => {
    const updatedBlock = {
      ...block,
      data: {
        ...block.data,
        ...updates,
      },
    };
    console.log("🔄 Block Update:", { updates, newData: updatedBlock.data });
    onChange(updatedBlock);
  };

  const handleOpenPicker = (type: "image" | "video") => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const handleSelectMedia = (media: { id: string; url: string; type: string; alt?: string }) => {
    console.log("🎯 Media ausgewählt:", media);
    if (pickerType === "image") {
      // Für courses-block: Hintergrundbild setzen
      if (block.type === "courses") {
        updateData({
          backgroundImage: {
            mediaId: media.id,
            url: media.url,
            alt: media.alt || "",
          },
        });
      } else {
        // Für andere Blöcke: normales media-Feld
        const existingMedia = block.data.media || (block.data.src ? { url: block.data.src, alt: block.data.alt || "", caption: block.data.caption || "" } : null);
        updateData({
          media: {
            mediaId: media.id,
            url: media.url,
            alt: media.alt || existingMedia?.alt || "",
            caption: existingMedia?.caption || "",
          },
        });
      }
    } else if (pickerType === "video") {
      updateData({
        media: {
          mediaId: media.id,
          url: media.url,
        },
      });
    }
    setPickerOpen(false);
  };

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Hero Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift
            </label>
            <input
              type="text"
              value={block.data.heading || ""}
              onChange={(e) => updateData({ heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Untertitel
            </label>
            <input
              type="text"
              value={block.data.subheading || ""}
              onChange={(e) => updateData({ subheading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ausrichtung
            </label>
            <select
              value={block.data.align || "center"}
              onChange={(e) => updateData({ align: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="left">Links</option>
              <option value="center">Zentriert</option>
              <option value="right">Rechts</option>
            </select>
          </div>
        </div>
      );

    case "text":
      return (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Text Block</h3>
              <button
                type="button"
                onClick={() => setTextEditorModalOpen(true)}
                className="px-3 py-1 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                title="In größerem Fenster bearbeiten"
              >
                ⛶ Ausdocken
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text
              </label>
              <textarea
                value={block.data.text || ""}
                onChange={(e) => updateData({ text: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
          {textEditorModalOpen && (
            <TextEditorModal
              block={block}
              onChange={onChange}
              onClose={() => setTextEditorModalOpen(false)}
            />
          )}
        </>
      );

    case "richText":
      return (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Formatierter Text Block</h3>
              <button
                type="button"
                onClick={() => setRichTextEditorModalOpen(true)}
                className="px-3 py-1 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                title="In größerem Fenster bearbeiten"
              >
                ⛶ Ausdocken
              </button>
            </div>
            <RichTextEditor block={block} onChange={onChange} compact={true} />
          </div>
          {richTextEditorModalOpen && (
            <RichTextEditorModal
              block={block}
              onChange={onChange}
              onClose={() => setRichTextEditorModalOpen(false)}
            />
          )}
        </>
      );

    case "image":
      const imageMedia = block.data.media || (block.data.src ? { url: block.data.src, alt: block.data.alt || "", caption: block.data.caption || "" } : null);
      const imageUrl = imageMedia?.url || block.data.src || "";
      const imageAlt = imageMedia?.alt || block.data.alt || "";
      const imageCaption = imageMedia?.caption || block.data.caption || "";

      return (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Bild Block</h3>
            
            {/* Media Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bild
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPicker("image")}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
                >
                  {imageUrl ? "Ersetzen" : "Aus Mediathek wählen"}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => updateData({ media: null, src: undefined, alt: undefined, caption: undefined })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 whitespace-nowrap"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>

            {/* Preview */}
            {imageUrl ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={imageAlt || "Vorschau"}
                  className="w-full max-h-48 object-contain bg-gray-50"
                  onError={(e) => {
                    console.error("❌ Fehler beim Laden der Vorschau:", imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 text-center">
                <p className="text-sm text-orange-700">Kein Bild ausgewählt</p>
              </div>
            )}

            {/* Alt-Text (Pflicht) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt-Text <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => {
                  const newAlt = e.target.value;
                  if (imageMedia) {
                    updateData({ media: { ...imageMedia, alt: newAlt } });
                  } else {
                    updateData({ alt: newAlt });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 ${
                  !imageAlt && imageUrl ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Beschreibung des Bildes"
              />
              {!imageAlt && imageUrl && (
                <p className="mt-1 text-xs text-red-600">Alt-Text ist erforderlich für Barrierefreiheit</p>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bildunterschrift (optional)
              </label>
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => {
                  const newCaption = e.target.value;
                  if (imageMedia) {
                    updateData({ media: { ...imageMedia, caption: newCaption } });
                  } else {
                    updateData({ caption: newCaption });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                placeholder="Bildunterschrift"
              />
            </div>

            {/* Größe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bildgröße (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={block.data.size ?? 100}
                  onChange={(e) => updateData({ size: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="10"
                  max="200"
                  step="5"
                  value={block.data.size ?? 100}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 10 && value <= 200) {
                      updateData({ size: value });
                    }
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-center"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                100% = Originalgröße (Standard)
              </p>
            </div>

            {/* Volle Breite */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={block.data.fullWidth || false}
                  onChange={(e) => updateData({ fullWidth: e.target.checked })}
                  className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Volle Breite (Bild auf gesamte Container-Breite strecken)
                </span>
              </label>
            </div>

            {/* Feste Höhe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feste Bildhöhe (optional)
              </label>
              <input
                type="text"
                value={block.data.fixedHeight || ""}
                onChange={(e) => updateData({ fixedHeight: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                placeholder="z.B. 300px oder 50vh"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional: Feste Höhe für das Bild (z.B. "300px", "50vh", "20rem"). Leer lassen für automatische Höhe.
              </p>
            </div>

            {/* Ecken abrunden */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ecken abrunden
              </label>
              <select
                value={block.data.rounded || "none"}
                onChange={(e) => updateData({ rounded: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              >
                <option value="none">Keine Rundung</option>
                <option value="sm">Klein (0.25rem)</option>
                <option value="md">Mittel (0.5rem)</option>
                <option value="lg">Groß (1rem)</option>
                <option value="full">Vollständig (Kreis)</option>
              </select>
            </div>

            {/* Rahmen-Stil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rahmen-Stil
              </label>
              <select
                value={block.data.borderStyle || "none"}
                onChange={(e) => {
                  const newBorderStyle = e.target.value;
                  const updates: any = { borderStyle: newBorderStyle };
                  // Entferne customBorderStyle, wenn der neue Stil nicht "custom" ist
                  if (newBorderStyle !== "custom") {
                    updates.customBorderStyle = undefined;
                  }
                  updateData(updates);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              >
                <option value="none">Kein Rahmen</option>
                <option value="glass">Glass</option>
                <option value="glow">Glow</option>
                <option value="gradient">Gradient</option>
                <option value="soft">Soft</option>
                <option value="minimal">Minimal</option>
                <option value="floating">Floating</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
              {block.data.borderStyle === "custom" && (
                <input
                  type="text"
                  value={block.data.customBorderStyle || ""}
                  onChange={(e) => updateData({ customBorderStyle: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 mt-2"
                  placeholder="CSS-Klassen (z.B. border-2 border-rose-500 rounded-lg)"
                />
              )}
            </div>

            {/* Rahmen-Optionen - nur anzeigen wenn ein Rahmen vorhanden ist */}
            {(block.data.borderStyle && block.data.borderStyle !== "none") && (
              <>
                {/* Abstand zwischen Rahmen und Bild */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Abstand zwischen Rahmen und Bild
                  </label>
                  <input
                    type="text"
                    value={block.data.borderPadding ?? "16px"}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      updateData({ borderPadding: value || "16px" });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="z.B. 8px, 16px, 24px"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Abstand zwischen Rahmen und Bild (Standard: 16px)
                  </p>
                </div>

                {/* Rahmenbreite */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rahmenbreite
                  </label>
                  <input
                    type="text"
                    value={block.data.borderWidth ?? ""}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      updateData({ borderWidth: value || undefined });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="z.B. 1px, 2px, 4px (leer = Standard)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Breite des Rahmens (leer lassen für Standard-Breite je nach Stil)
                  </p>
                </div>
              </>
            )}
          </div>
          <MediaPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            type={pickerType}
            onSelect={handleSelectMedia}
          />
        </>
      );

    case "video":
      const videoMedia = block.data.media || (block.data.src ? { url: block.data.src } : null);
      const videoUrl = videoMedia?.url || block.data.src || "";

      return (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Video Block</h3>
            
            {/* Media Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPicker("video")}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
                >
                  {videoUrl ? "Ersetzen" : "Aus Mediathek wählen"}
                </button>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => updateData({ media: null, src: undefined })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 whitespace-nowrap"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>

            {/* Preview */}
            {videoUrl && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <video
                  src={videoUrl}
                  controls
                  className="w-full max-h-48 bg-gray-50"
                >
                  Dein Browser unterstützt das Video-Element nicht.
                </video>
              </div>
            )}

            {!videoUrl && (
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 text-center">
                <p className="text-sm text-orange-700">Kein Video ausgewählt</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel (optional)
              </label>
              <input
                type="text"
                value={block.data.title || ""}
                onChange={(e) => updateData({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                placeholder="Video-Titel"
              />
            </div>
          </div>
          <MediaPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            type={pickerType}
            onSelect={handleSelectMedia}
          />
        </>
      );

    case "features":
      return (
        <FeaturesEditor block={block} onChange={onChange} />
      );

    case "testimonials":
      return (
        <TestimonialsEditor block={block} onChange={onChange} />
      );

    case "cta":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Call to Action Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift
            </label>
            <input
              type="text"
              value={block.data.heading || ""}
              onChange={(e) => updateData({ heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text
            </label>
            <textarea
              value={block.data.text || ""}
              onChange={(e) => updateData({ text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button-Text
            </label>
            <input
              type="text"
              value={block.data.buttonLabel || ""}
              onChange={(e) => updateData({ buttonLabel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button-Link
            </label>
            <input
              type="url"
              value={block.data.buttonHref || ""}
              onChange={(e) => updateData({ buttonHref: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Abstand Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Größe
            </label>
            <select
              value={block.data.size || "md"}
              onChange={(e) => updateData({ size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="sm">Klein</option>
              <option value="md">Mittel</option>
              <option value="lg">Groß</option>
              <option value="xl">Sehr groß</option>
            </select>
          </div>
        </div>
      );

    case "table":
      return <TableEditor block={block} onChange={onChange} />;

    case "current-appointments":
      return (
        <>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Aktuelle Termine Block</h3>
          <p className="text-sm text-gray-600">
            Dieser Block zeigt aktuelle Termine aus dem Kalender an. Wähle aus, welche Kursarten angezeigt werden sollen.
          </p>
          
          {/* Überschrift */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift (HTML möglich)
            </label>
            <textarea
              value={block.data.title || ""}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="Aktuelle Termine oder &lt;h2&gt;Aktuelle Termine&lt;/h2&gt;"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Überschrift für den Block. Unterstützt HTML-Code (z.B. &lt;strong&gt;, &lt;em&gt;, &lt;span&gt;).
            </p>
          </div>

          {/* Breite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block-Breite
            </label>
            <select
              value={block.data.width === "full" || block.data.width === "narrow" || block.data.width === "medium" ? block.data.width : "custom"}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  // Wenn auf "custom" gewechselt wird, setze einen Standard-Wert falls noch keiner vorhanden ist
                  if (!block.data.width || ["full", "narrow", "medium"].includes(block.data.width)) {
                    updateData({ width: "800px" });
                  }
                } else {
                  updateData({ width: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="full">Volle Breite</option>
              <option value="medium">Mittel (max. 1200px)</option>
              <option value="narrow">Schmal (max. 800px)</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
            {(block.data.width === "custom" || (block.data.width && !["full", "narrow", "medium"].includes(block.data.width))) && (
              <input
                type="text"
                value={block.data.width && !["full", "narrow", "medium"].includes(block.data.width) ? block.data.width : "800px"}
                onChange={(e) => updateData({ width: e.target.value.trim() || "800px" })}
                placeholder="z.B. 800px, 90%, 1200px"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 mt-2"
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              Breite des Blocks. Benutzerdefiniert: z.B. "800px", "90%", "1200px".
            </p>
          </div>

          {/* Kursarten-Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anzuzeigende Kursarten
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={block.data.showCourses !== false}
                  onChange={(e) => updateData({ showCourses: e.target.checked })}
                  className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Babyzeichenkurse anzeigen
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={block.data.showTopics !== false}
                  onChange={(e) => updateData({ showTopics: e.target.checked })}
                  className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Themenstunden anzeigen
                </span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Wähle aus, welche Kursarten im Block angezeigt werden sollen.
            </p>
          </div>

          {/* Max. Anzahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. Anzahl Termine
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={block.data.maxItems || 10}
              onChange={(e) => updateData({ maxItems: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximale Anzahl an Terminen, die angezeigt werden sollen (Standard: 10).
            </p>
          </div>

          {/* Leere Meldung */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={block.data.showEmptyMessage !== false}
                onChange={(e) => updateData({ showEmptyMessage: e.target.checked })}
                className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Meldung anzeigen, wenn keine Termine verfügbar
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Zeigt eine Meldung an, wenn keine Termine verfügbar sind.
            </p>
          </div>

          {/* Footer HTML */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hinweis unter den Terminen (HTML)
            </label>
            <textarea
              value={block.data.footerHtml || ""}
              onChange={(e) => updateData({ footerHtml: e.target.value })}
              placeholder="<p>Optionaler HTML-Hinweis unter den Terminen</p>"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: HTML-Code für einen Hinweis unter den Terminen. Unterstützt alle HTML-Tags.
            </p>
          </div>
        </div>
        </>
      );

    case "herzzeit-story":
      return <HerzZeitStoryEditor block={block} onChange={onChange} />;

    case "courses":
      const backgroundImage = block.data.backgroundImage || (block.data.backgroundImageUrl ? { url: block.data.backgroundImageUrl } : null);
      const backgroundImageUrl = backgroundImage?.url || "";

      return (
        <>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Kurse & Termine Block</h3>
          <p className="text-sm text-gray-600">
            Dieser Block zeigt automatisch die aktuellen Kurse aus dem Kalender an.
          </p>
          
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={block.data.title || ""}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="Entdecke die Welt der Babyzeichen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Hauptüberschrift für den Hero-Bereich des Terminblocks.
            </p>
          </div>

          {/* Untertitel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Untertitel
            </label>
            <textarea
              value={block.data.subtitle || ""}
              onChange={(e) => updateData({ subtitle: e.target.value })}
              placeholder="In unserer Master-Übersicht findest du alle aktuellen Angebote. Tauche ein in eine entspannte Atmosphäre und stärke die Bindung zu deinem Kind."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Beschreibungstext für den Hero-Bereich des Terminblocks.
            </p>
          </div>
          
          {/* Hintergrundbild */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hintergrundbild
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleOpenPicker("image")}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
              >
                {backgroundImageUrl ? "Ersetzen" : "Aus Mediathek wählen"}
              </button>
              {backgroundImageUrl && (
                <button
                  type="button"
                  onClick={() => updateData({ backgroundImage: null })}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 whitespace-nowrap"
                >
                  Entfernen
                </button>
              )}
            </div>
            {backgroundImageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={backgroundImageUrl}
                  alt={backgroundImage?.alt || "Hintergrundbild"}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Hintergrundbild für den Terminblock auswählen.
            </p>
          </div>

          {/* Transparenz des Hintergrundbilds */}
          {backgroundImageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transparenz des Overlays
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={block.data.backgroundImageOpacity ?? 75}
                  onChange={(e) => updateData({ backgroundImageOpacity: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 w-12 text-right">
                  {block.data.backgroundImageOpacity ?? 75}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Regelt die Transparenz des weißen Overlays über dem Hintergrundbild (0% = vollständig transparent, 100% = vollständig opak).
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. Anzahl Babyzeichenkurse
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={block.data.maxCourses || 3}
              onChange={(e) => updateData({ maxCourses: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximale Anzahl an mehrwöchigen Kursen, die angezeigt werden sollen.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. Anzahl Themenstunden
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={block.data.maxTopics || 3}
              onChange={(e) => updateData({ maxTopics: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximale Anzahl an Themenstunden, die angezeigt werden sollen.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={block.data.showEmptyMessage !== false}
                onChange={(e) => updateData({ showEmptyMessage: e.target.checked })}
                className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Meldung anzeigen, wenn keine Kurse verfügbar
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Zeigt eine Meldung an, wenn keine Kurse in der jeweiligen Kategorie verfügbar sind.
            </p>
          </div>

          {/* Link zum Kontakt aufnehmen */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Link zum Kontakt</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kontakt-URL
                </label>
                <input
                  type="text"
                  value={block.data.contactLinkUrl ?? "#kontakt"}
                  onChange={(e) => updateData({ contactLinkUrl: e.target.value || undefined })}
                  placeholder="#kontakt oder /kontakt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ziel des Buttons „Kontakt aufnehmen“ (z. B. #kontakt für Anker oder /kontakt für eine Seite).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link-Text
                </label>
                <input
                  type="text"
                  value={block.data.contactLinkLabel ?? ""}
                  onChange={(e) => updateData({ contactLinkLabel: e.target.value || undefined })}
                  placeholder="Jetzt Kontakt aufnehmen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Beschriftung des Kontakt-Buttons. Leer = Standard „Jetzt Kontakt aufnehmen“.
                </p>
              </div>
            </div>
          </div>
        </div>
        <MediaPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          type={pickerType}
          onSelect={handleSelectMedia}
        />
        </>
      );

    case "contactForm":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Kontaktformular Block</h3>
          
          {/* Kontaktdaten */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Kontaktdaten</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={block.data.name || ""}
                  onChange={(e) => updateData({ name: e.target.value })}
                  placeholder="ULRIKE BARTHEL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle/Titel
                </label>
                <textarea
                  value={block.data.role || ""}
                  onChange={(e) => updateData({ role: e.target.value })}
                  placeholder="HEILPÄDAGOGIN & BABYKURSTRAINERIN"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  value={block.data.address || ""}
                  onChange={(e) => updateData({ address: e.target.value })}
                  placeholder="Schönborner Str 47&#10;09661 Rossau"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={block.data.phone || ""}
                  onChange={(e) => updateData({ phone: e.target.value })}
                  placeholder="0174 / 837 24 63"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon-Link (tel:)
                </label>
                <input
                  type="text"
                  value={block.data.phoneLink || ""}
                  onChange={(e) => updateData({ phoneLink: e.target.value })}
                  placeholder="tel:+491748372463"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={block.data.email || ""}
                  onChange={(e) => updateData({ email: e.target.value })}
                  placeholder="info@familien-herz-zeit.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Link (mailto:)
                </label>
                <input
                  type="text"
                  value={block.data.emailLink || ""}
                  onChange={(e) => updateData({ emailLink: e.target.value })}
                  placeholder="mailto:info@familien-herz-zeit.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Sprechzeiten */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Sprechzeiten</h4>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.showOfficeHours !== false}
                  onChange={(e) => updateData({ showOfficeHours: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Sprechzeiten anzeigen
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  value={block.data.officeHoursTitle || ""}
                  onChange={(e) => updateData({ officeHoursTitle: e.target.value })}
                  placeholder="SPRECHZEITEN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text
                </label>
                <textarea
                  value={block.data.officeHoursText || ""}
                  onChange={(e) => updateData({ officeHoursText: e.target.value })}
                  placeholder="Terminanfragen für Themenstunden werden in der Regel innerhalb von 48 Stunden beantwortet."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Formular-Felder */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Formular-Felder</h4>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.showFirstName !== false}
                  onChange={(e) => updateData({ showFirstName: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Vorname-Feld anzeigen
                </label>
              </div>

              {block.data.showFirstName !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vorname Label
                    </label>
                    <input
                      type="text"
                      value={block.data.firstNameLabel || ""}
                      onChange={(e) => updateData({ firstNameLabel: e.target.value })}
                      placeholder="VORNAME"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={block.data.firstNameRequired !== false}
                      onChange={(e) => updateData({ firstNameRequired: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Vorname erforderlich
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.showLastName !== false}
                  onChange={(e) => updateData({ showLastName: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Nachname-Feld anzeigen
                </label>
              </div>

              {block.data.showLastName !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nachname Label
                    </label>
                    <input
                      type="text"
                      value={block.data.lastNameLabel || ""}
                      onChange={(e) => updateData({ lastNameLabel: e.target.value })}
                      placeholder="NACHNAME"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={block.data.lastNameRequired !== false}
                      onChange={(e) => updateData({ lastNameRequired: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Nachname erforderlich
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Label
                </label>
                <input
                  type="text"
                  value={block.data.emailLabel || ""}
                  onChange={(e) => updateData({ emailLabel: e.target.value })}
                  placeholder="EMAIL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.emailRequired !== false}
                  onChange={(e) => updateData({ emailRequired: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  E-Mail erforderlich
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nachricht Label
                </label>
                <input
                  type="text"
                  value={block.data.messageLabel || ""}
                  onChange={(e) => updateData({ messageLabel: e.target.value })}
                  placeholder="NACHRICHT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.messageRequired !== false}
                  onChange={(e) => updateData({ messageRequired: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Nachricht erforderlich
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submit-Button Text
                </label>
                <input
                  type="text"
                  value={block.data.submitButtonText || ""}
                  onChange={(e) => updateData({ submitButtonText: e.target.value })}
                  placeholder="NACHRICHT SENDEN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* reCAPTCHA */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">reCAPTCHA</h4>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={block.data.enableRecaptcha !== false}
                  onChange={(e) => updateData({ enableRecaptcha: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  reCAPTCHA aktivieren
                </label>
              </div>

              {block.data.enableRecaptcha !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    reCAPTCHA Site Key (optional, sonst aus ENV)
                  </label>
                  <input
                    type="text"
                    value={block.data.recaptchaSiteKey || ""}
                    onChange={(e) => updateData({ recaptchaSiteKey: e.target.value })}
                    placeholder="Wird aus NEXT_PUBLIC_RECAPTCHA_SITE_KEY verwendet, falls leer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Falls leer, wird NEXT_PUBLIC_RECAPTCHA_SITE_KEY aus der Umgebungsvariable verwendet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Layout */}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Layout</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout-Variante
              </label>
              <select
                value={block.data.layout || "default"}
                onChange={(e) => updateData({ layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              >
                <option value="default">Standard (2 Spalten)</option>
                <option value="stacked">Gestapelt (1 Spalte)</option>
              </select>
            </div>
          </div>
        </div>
      );

    default:
      return <div>Unbekannter Block-Typ</div>;
  }
}

function FeaturesEditor({ block, onChange }: BlockEditorProps) {
  const items = block?.data.items || [];

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({
      ...block!,
      data: { items: newItems },
    });
  };

  const addItem = () => {
    onChange({
      ...block!,
      data: { items: [...items, { title: "", text: "" }] },
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block!,
      data: { items: items.filter((_item: any, i: number) => i !== index) },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Features Block</h3>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
        >
          + Feature
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Feature {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Entfernen
              </button>
            </div>
            <input
              type="text"
              value={item.title || ""}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              placeholder="Titel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-rose-500"
            />
            <textarea
              value={item.text || ""}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              placeholder="Beschreibung"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function HerzZeitStoryEditor({ block, onChange }: BlockEditorProps) {
  if (!block) return null;
  const stories = block.data.stories || [];
  const [audioUploading, setAudioUploading] = useState<string | null>(null);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const audioFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [generatingMetadata, setGeneratingMetadata] = useState<{ storyId: string; type: 'title' | 'teaser' | 'readingTime' } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState<string | null>(null);
  
  // Ref für aktuellsten Block, um stale closures zu vermeiden
  const blockRef = useRef(block);
  useEffect(() => {
    blockRef.current = block;
  }, [block]);

  const updateStory = useCallback((index: number, updates: Record<string, any>) => {
    // Verwende blockRef.current, um immer die aktuellsten Daten zu haben
    const currentBlock = blockRef.current;
    if (!currentBlock) return;
    
    const currentStories = currentBlock.data.stories || [];
    const newStories = [...currentStories];
    newStories[index] = { ...newStories[index], ...updates };
    const updatedBlock = {
      ...currentBlock,
      data: {
        ...currentBlock.data,
        stories: newStories,
      },
    };
    onChange(updatedBlock);
  }, [onChange]);

  const addStory = useCallback(() => {
    const currentBlock = blockRef.current;
    if (!currentBlock) return;
    
    const currentStories = currentBlock.data.stories || [];
    const newStory = {
      id: createBlockId(),
      title: "",
      teaser: "",
      readingTime: "",
      audioUrl: "",
      imageUrl: "",
      fullText: "<p></p>",
    };
    onChange({
      ...currentBlock,
      data: {
        ...currentBlock.data,
        stories: [...currentStories, newStory],
      },
    });
  }, [onChange]);

  const removeStory = useCallback((index: number) => {
    const currentBlock = blockRef.current;
    if (!currentBlock) return;
    
    const currentStories = currentBlock.data.stories || [];
    onChange({
      ...currentBlock,
      data: {
        ...currentBlock.data,
        stories: currentStories.filter((_story: any, i: number) => i !== index),
      },
    });
  }, [onChange]);

  const updateBlockSettings = useCallback((updates: Record<string, any>) => {
    const currentBlock = blockRef.current;
    if (!currentBlock) return;
    
    onChange({
      ...currentBlock,
      data: {
        ...currentBlock.data,
        ...updates,
      },
    });
  }, [onChange]);

  const handleAudioUpload = async (storyId: string, file: File) => {
    setAudioUploading(storyId);
    setAudioUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload fehlgeschlagen");
      }

      const data = await response.json();
      // Verwende blockRef.current, um immer die aktuellsten Daten zu haben
      const currentBlock = blockRef.current;
      if (!currentBlock) return;
      
      const currentStories = currentBlock.data.stories || [];
      const storyIndex = currentStories.findIndex((s: any) => s.id === storyId);
      if (storyIndex !== -1) {
        updateStory(storyIndex, { audioUrl: data.url });
      }
    } catch (err: any) {
      setAudioUploadError(err.message || "Fehler beim Hochladen");
    } finally {
      setAudioUploading(null);
      const input = audioFileInputRefs.current.get(storyId);
      if (input) {
        input.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">HerzZeit-Geschichten Block</h3>
          <p className="text-sm text-gray-600">
            Erstelle mehrere klickbare Kacheln, die beim Klick ein Popup mit der Geschichte und optionalem Audio öffnen.
          </p>
        </div>
        <button
          type="button"
          onClick={addStory}
          className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
        >
          + Geschichte
        </button>
      </div>

      {/* Globale Einstellungen */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Globale Einstellungen</h4>
        <div className="space-y-3">
          {/* Überschrift */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift (optional, HTML möglich)
            </label>
            <textarea
              value={block.data.title || ""}
              onChange={(e) => updateBlockSettings({ title: e.target.value || undefined })}
              placeholder="z.B. &lt;h2&gt;HerzZeit-Geschichten&lt;/h2&gt;"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              HTML-Code wird unterstützt (z.B. &lt;h2&gt;, &lt;strong&gt;, &lt;em&gt;)
            </p>
          </div>

          {/* Stil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kachel-Stil (für alle Geschichten)
            </label>
            <select
              value={block.data.style || "card"}
              onChange={(e) => updateBlockSettings({ style: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="card">Karte (Standard)</option>
              <option value="banner">Banner</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          {/* Hintergrundfarbe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hintergrundfarbe (optional, für alle Geschichten)
            </label>
            <input
              type="text"
              value={block.data.backgroundColor || ""}
              onChange={(e) => updateBlockSettings({ backgroundColor: e.target.value || undefined })}
              placeholder="z.B. #f3f4f6 oder bg-rose-50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Geschichten-Liste */}
      <div className="space-y-4">
        {stories.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
            <p className="text-sm">Keine Geschichten vorhanden. Füge eine Geschichte hinzu.</p>
          </div>
        ) : (
          stories.map((story: any, index: number) => (
            <div key={story.id || index} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">Geschichte {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeStory(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Entfernen
                </button>
              </div>

              <div className="space-y-4">
                {/* Titel */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Titel der Geschichte *
                    </label>
                    {story.fullText && story.fullText.trim() !== "<p></p>" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const storyId = story.id;
                          setGeneratingMetadata({ storyId, type: 'title' });
                          setGenerationError(null);

                          try {
                            const response = await fetch("/api/generate-story-metadata", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                fullText: story.fullText,
                                generateTitle: true,
                                generateTeaser: false,
                              }),
                            });

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.error || "Fehler beim Generieren");
                            }

                            const data = await response.json();
                            if (data.title) {
                              updateStory(index, { title: data.title });
                            }
                          } catch (err: any) {
                            setGenerationError(err.message || "Fehler beim Generieren des Titels");
                          } finally {
                            setGeneratingMetadata(null);
                          }
                        }}
                        disabled={generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'title'}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Titel mit ChatGPT generieren"
                      >
                        {generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'title' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generiere...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Titel generieren
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={story.title || ""}
                    onChange={(e) => updateStory(index, { title: e.target.value })}
                    placeholder="z.B. Der Pfeifton & der Vogel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                  {generationError && generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'title' && (
                    <p className="mt-1 text-xs text-red-600">{generationError}</p>
                  )}
                </div>

                {/* Teaser */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Teaser (1-2 Zeilen) *
                    </label>
                    {story.fullText && story.fullText.trim() !== "<p></p>" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const storyId = story.id;
                          setGeneratingMetadata({ storyId, type: 'teaser' });
                          setGenerationError(null);

                          try {
                            const response = await fetch("/api/generate-story-metadata", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                fullText: story.fullText,
                                generateTitle: false,
                                generateTeaser: true,
                              }),
                            });

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.error || "Fehler beim Generieren");
                            }

                            const data = await response.json();
                            if (data.teaser) {
                              updateStory(index, { teaser: data.teaser });
                            }
                          } catch (err: any) {
                            setGenerationError(err.message || "Fehler beim Generieren des Teasers");
                          } finally {
                            setGeneratingMetadata(null);
                          }
                        }}
                        disabled={generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'teaser'}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Teaser mit ChatGPT generieren"
                      >
                        {generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'teaser' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generiere...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Teaser generieren
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={story.teaser || ""}
                    onChange={(e) => updateStory(index, { teaser: e.target.value })}
                    placeholder="Eine kleine Geschichte über..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                  {generationError && generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'teaser' && (
                    <p className="mt-1 text-xs text-red-600">{generationError}</p>
                  )}
                </div>

                {/* Lesezeit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Lesezeit (optional)
                    </label>
                    {story.fullText && story.fullText.trim() !== "<p></p>" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const storyId = story.id;
                          setGeneratingMetadata({ storyId, type: 'readingTime' });
                          setGenerationError(null);

                          try {
                            const response = await fetch("/api/generate-story-metadata", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                fullText: story.fullText,
                                generateTitle: false,
                                generateTeaser: false,
                                generateReadingTime: true,
                              }),
                            });

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.error || "Fehler beim Generieren");
                            }

                            const data = await response.json();
                            if (data.readingTime) {
                              updateStory(index, { readingTime: data.readingTime });
                            }
                          } catch (err: any) {
                            setGenerationError(err.message || "Fehler beim Generieren der Lesezeit");
                          } finally {
                            setGeneratingMetadata(null);
                          }
                        }}
                        disabled={generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'readingTime'}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Lesezeit mit ChatGPT generieren"
                      >
                        {generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'readingTime' ? (
                          <>
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generiere...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Lesezeit generieren
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={story.readingTime || ""}
                    onChange={(e) => updateStory(index, { readingTime: e.target.value })}
                    placeholder="z.B. 2 min lesen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                  {generationError && generatingMetadata?.storyId === story.id && generatingMetadata?.type === 'readingTime' && (
                    <p className="mt-1 text-xs text-red-600">{generationError}</p>
                  )}
                </div>

                {/* Audio Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audio-Datei (optional)
                  </label>
                  <div className="flex gap-2 items-start">
                    <input
                      ref={(el) => {
                        if (el) audioFileInputRefs.current.set(story.id, el);
                      }}
                      type="file"
                      accept="audio/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (!file.type.startsWith("audio/")) {
                          setAudioUploadError("Bitte wähle eine Audio-Datei aus");
                          const input = audioFileInputRefs.current.get(story.id);
                          if (input) input.value = "";
                          return;
                        }

                        await handleAudioUpload(story.id, file);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => audioFileInputRefs.current.get(story.id)?.click()}
                      disabled={audioUploading === story.id}
                      className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {audioUploading === story.id ? "Lädt hoch..." : story.audioUrl ? "Ersetzen" : "Audio hochladen"}
                    </button>
                    {story.audioUrl && (
                      <button
                        type="button"
                        onClick={() => updateStory(index, { audioUrl: "" })}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 whitespace-nowrap"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                  {audioUploadError && audioUploading === story.id && (
                    <p className="mt-1 text-xs text-red-600">{audioUploadError}</p>
                  )}
                  {story.audioUrl && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Aktuelle Audio-Datei:</p>
                      <audio controls src={story.audioUrl} className="w-full">
                        Dein Browser unterstützt das Audio-Element nicht.
                      </audio>
                    </div>
                  )}
                </div>

                {/* Bild */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bild (optional)
                  </label>
                  <div className="flex gap-2 items-start">
                    <button
                      type="button"
                      onClick={() => setImagePickerOpen(story.id)}
                      className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
                    >
                      {story.imageUrl ? "Bild ersetzen" : "Bild auswählen"}
                    </button>
                    {story.imageUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStory(index, { imageUrl: "" })}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 whitespace-nowrap"
                        >
                          Entfernen
                        </button>
                      </>
                    )}
                  </div>
                  {story.imageUrl && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Aktuelles Bild:</p>
                      <img
                        src={story.imageUrl}
                        alt={story.title || "Geschichten-Bild"}
                        className="w-full max-h-48 object-contain rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Volltext */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vollständiger Text der Geschichte * (formatiert)
                  </label>
                  <TinyMCEBlockEditor
                    content={story.fullText || "<p></p>"}
                    onChange={(html) => updateStory(index, { fullText: html })}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {imagePickerOpen && (
        <MediaPickerModal
          open={true}
          onClose={() => setImagePickerOpen(null)}
          type="image"
          onSelect={(media) => {
            const currentBlock = blockRef.current;
            if (!currentBlock) return;
            
            const currentStories = currentBlock.data.stories || [];
            const storyIndex = currentStories.findIndex((s: any) => s.id === imagePickerOpen);
            if (storyIndex !== -1) {
              updateStory(storyIndex, { imageUrl: media.url });
            }
            setImagePickerOpen(null);
          }}
        />
      )}
    </div>
  );
}

function TestimonialsEditor({ block, onChange }: BlockEditorProps) {
  const items = block?.data.items || [];

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({
      ...block!,
      data: { items: newItems },
    });
  };

  const addItem = () => {
    onChange({
      ...block!,
      data: { items: [...items, { name: "", text: "" }] },
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block!,
      data: { items: items.filter((_item: any, i: number) => i !== index) },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Testimonials Block</h3>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
        >
          + Testimonial
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Testimonial {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Entfernen
              </button>
            </div>
            <input
              type="text"
              value={item.name || ""}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-rose-500"
            />
            <textarea
              value={item.text || ""}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              placeholder="Testimonial Text"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableEditor({ block, onChange }: BlockEditorProps) {
  const rows = block?.data.rows || [];
  const columnWidths = block?.data.columnWidths || [];

  const updateTable = (newRows: any[], newColumnWidths?: string[]) => {
    // Bereinige die Daten: Entferne undefined/null Werte und stelle sicher, dass alle Zellen korrekt strukturiert sind
    const cleanedRows = newRows.map(row => ({
      ...row,
      cells: row.cells.map((cell: any) => {
        const cleanedCell: any = {
          blocks: cell.blocks || [],
        };
        
        // Füge nur definierte Eigenschaften hinzu
        if (cell.borderStyle) {
          cleanedCell.borderStyle = cell.borderStyle;
          // WICHTIG: Nur customBorderStyle hinzufügen, wenn borderStyle wirklich "custom" ist
          if (cell.borderStyle === "custom" && cell.customBorderStyle) {
            cleanedCell.customBorderStyle = cell.customBorderStyle;
          }
          // Wenn borderStyle nicht "custom" ist, customBorderStyle NICHT hinzufügen (auch wenn es existiert)
        }
        if (cell.backgroundColor) cleanedCell.backgroundColor = cell.backgroundColor;
        
        return cleanedCell;
      }),
    }));
    
    // Bereinige columnWidths: Leere Strings werden zu "auto" oder entfernt
    let cleanedColumnWidths: string[] | undefined = undefined;
    if (newColumnWidths !== undefined) {
      cleanedColumnWidths = newColumnWidths.map((width: string) => {
        const trimmed = (width || "").trim();
        // Wenn leer oder nur Leerzeichen, verwende "auto"
        return trimmed === "" ? "auto" : trimmed;
      });
      // Wenn alle Werte "auto" sind, können wir das Array optional lassen
      if (cleanedColumnWidths && cleanedColumnWidths.every(w => w === "auto")) {
        cleanedColumnWidths = undefined;
      }
    } else if (columnWidths && columnWidths.length > 0) {
      // Bereinige auch bestehende columnWidths
      cleanedColumnWidths = columnWidths.map((width: string) => {
        const trimmed = (width || "").trim();
        return trimmed === "" ? "auto" : trimmed;
      });
      if (cleanedColumnWidths && cleanedColumnWidths.every(w => w === "auto")) {
        cleanedColumnWidths = undefined;
      }
    }
    
    const updatedData: any = { 
      ...block!.data,
      rows: cleanedRows,
    };
    
    // Füge columnWidths nur hinzu, wenn es definiert ist und nicht alle "auto" sind
    if (cleanedColumnWidths !== undefined && cleanedColumnWidths.length > 0) {
      updatedData.columnWidths = cleanedColumnWidths;
    } else {
      // Entferne columnWidths, wenn es nicht benötigt wird
      delete updatedData.columnWidths;
    }
    
    onChange({
      ...block!,
      data: updatedData,
    });
  };

  const updateTableSettings = (updates: Record<string, any>) => {
    onChange({
      ...block!,
      data: {
        ...block!.data,
        ...updates,
      },
    });
  };

  const updateColumnWidth = (columnIndex: number, width: string) => {
    const newColumnWidths = [...columnWidths];
    // Bereinige den Wert: Leere Strings werden zu "auto"
    const cleanedWidth = (width || "").trim();
    newColumnWidths[columnIndex] = cleanedWidth === "" ? "auto" : cleanedWidth;
    updateTable(rows, newColumnWidths);
  };

  const addRow = () => {
    const columnCount = rows.length > 0 ? rows[0].cells.length : 2;
    const newRow = {
      cells: Array.from({ length: columnCount }, () => ({ blocks: [] })),
    };
    // Initialisiere columnWidths falls noch nicht vorhanden
    let newColumnWidths = columnWidths;
    if (newColumnWidths.length === 0 && columnCount > 0) {
      newColumnWidths = Array.from({ length: columnCount }, () => "auto");
    }
    updateTable([...rows, newRow], newColumnWidths);
  };

  const removeRow = (rowIndex: number) => {
    updateTable(rows.filter((_row: any, i: number) => i !== rowIndex));
  };

  const addColumn = () => {
    const newRows = rows.map((row: any) => ({
      ...row,
      cells: [...row.cells, { blocks: [] }],
    }));
    // Füge Standard-Breite für neue Spalte hinzu
    const newColumnWidths = [...columnWidths, "auto"];
    updateTable(newRows, newColumnWidths);
  };

  const removeColumn = (columnIndex: number) => {
    const newRows = rows.map((row: any) => ({
      ...row,
      cells: row.cells.filter((_cell: any, i: number) => i !== columnIndex),
    }));
    // Entferne Breite für gelöschte Spalte
    const newColumnWidths = columnWidths.filter((_width: string, i: number) => i !== columnIndex);
    updateTable(newRows, newColumnWidths);
  };

  const addBlockToCell = (rowIndex: number, cellIndex: number, blockType: any) => {
    const newRows = [...rows];
    const newCells = [...newRows[rowIndex].cells];
    const newCell = {
      ...newCells[cellIndex],
      blocks: [...newCells[cellIndex].blocks, createBlock(blockType)],
    };
    newCells[cellIndex] = newCell;
    newRows[rowIndex] = { ...newRows[rowIndex], cells: newCells };
    updateTable(newRows);
  };

  const removeBlockFromCell = (rowIndex: number, cellIndex: number, blockId: string) => {
    const newRows = [...rows];
    const newCells = [...newRows[rowIndex].cells];
    const newCell = {
      ...newCells[cellIndex],
      blocks: newCells[cellIndex].blocks.filter((b: any) => b.id !== blockId),
    };
    newCells[cellIndex] = newCell;
    newRows[rowIndex] = { ...newRows[rowIndex], cells: newCells };
    updateTable(newRows);
  };

  const updateCellBlock = (rowIndex: number, cellIndex: number, blockId: string, updatedBlock: any) => {
    const newRows = [...rows];
    const newCells = [...newRows[rowIndex].cells];
    const newCell = {
      ...newCells[cellIndex],
      blocks: newCells[cellIndex].blocks.map((b: any) =>
        b.id === blockId ? updatedBlock : b
      ),
    };
    newCells[cellIndex] = newCell;
    newRows[rowIndex] = { ...newRows[rowIndex], cells: newCells };
    updateTable(newRows);
  };


  const updateCellStyle = (rowIndex: number, cellIndex: number, styleUpdates: any) => {
    const newRows = rows.map((row: any, rIdx: number) => {
      if (rIdx !== rowIndex) return row;
      return {
        ...row,
        cells: row.cells.map((cell: any, cIdx: number) => {
          if (cIdx !== cellIndex) return cell;
          
          // Bereinige styleUpdates: Entferne undefined/null/leere Strings
          const cleanUpdates: any = {};
          Object.keys(styleUpdates).forEach(key => {
            const value = styleUpdates[key];
            if (value !== undefined && value !== null && value !== "") {
              cleanUpdates[key] = value;
            }
          });
          
          // Erstelle neues Zell-Objekt mit allen bestehenden Eigenschaften
          const updatedCell: any = {
            ...cell,
            blocks: cell.blocks || [],
            // Aktualisiere nur die geänderten Eigenschaften
            ...cleanUpdates,
          };
          
          // Entferne customBorderStyle, wenn borderStyle nicht "custom" ist
          // WICHTIG: Prüfe den neuen borderStyle aus cleanUpdates, nicht den alten
          const newBorderStyle = cleanUpdates.borderStyle !== undefined ? cleanUpdates.borderStyle : updatedCell.borderStyle;
          if (newBorderStyle !== "custom") {
            delete updatedCell.customBorderStyle;
          }
          
          // Entferne leere/undefined Eigenschaften für saubere Serialisierung
          const finalCell: any = { blocks: updatedCell.blocks || [] };
          if (updatedCell.borderStyle) finalCell.borderStyle = updatedCell.borderStyle;
          // Nur customBorderStyle hinzufügen, wenn borderStyle wirklich "custom" ist
          if (finalCell.borderStyle === "custom" && updatedCell.customBorderStyle) {
            finalCell.customBorderStyle = updatedCell.customBorderStyle;
          }
          if (updatedCell.backgroundColor) finalCell.backgroundColor = updatedCell.backgroundColor;
          
          return finalCell;
        }),
      };
    });
    updateTable(newRows);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Tabelle Block</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
            title="Zeile hinzufügen"
          >
            + Zeile
          </button>
          <button
            type="button"
            onClick={addColumn}
            className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
            title="Spalte hinzufügen"
          >
            + Spalte
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          <p className="text-sm">Tabelle ist leer. Füge eine Zeile hinzu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zeilenabstand-Einstellung */}
          <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Zeilenabstand</h4>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Abstand zwischen Zeilen
              </label>
              <select
                value={block?.data.rowSpacing || "md"}
                onChange={(e) => updateTableSettings({ rowSpacing: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
              >
                <option value="sm">Klein (4px)</option>
                <option value="md">Mittel (8px)</option>
                <option value="lg">Groß (16px)</option>
                <option value="xl">Sehr groß (24px)</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
              {block?.data.rowSpacing === "custom" && (
                <input
                  type="text"
                  value={block?.data.customRowSpacing || ""}
                  onChange={(e) => updateTableSettings({ customRowSpacing: e.target.value })}
                  placeholder="z.B. 12px oder 1rem"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 mt-2"
                />
              )}
            </div>
          </div>

          {/* Spaltenabstand-Einstellung */}
          <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Spaltenabstand</h4>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Abstand zwischen Spalten
              </label>
              <select
                value={block?.data.columnSpacing || "md"}
                onChange={(e) => updateTableSettings({ columnSpacing: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
              >
                <option value="sm">Klein (4px)</option>
                <option value="md">Mittel (8px)</option>
                <option value="lg">Groß (16px)</option>
                <option value="xl">Sehr groß (24px)</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
              {block?.data.columnSpacing === "custom" && (
                <input
                  type="text"
                  value={block?.data.customColumnSpacing || ""}
                  onChange={(e) => updateTableSettings({ customColumnSpacing: e.target.value })}
                  placeholder="z.B. 12px oder 1rem"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 mt-2"
                />
              )}
            </div>
          </div>

          {/* Zellen-Padding-Einstellung */}
          <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Zellen-Padding</h4>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Innenabstand der Zellen
              </label>
              <select
                value={block?.data.cellPadding || "md"}
                onChange={(e) => updateTableSettings({ cellPadding: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
              >
                <option value="none">Kein Padding (0px)</option>
                <option value="sm">Klein (8px)</option>
                <option value="md">Mittel (16px)</option>
                <option value="lg">Groß (24px)</option>
                <option value="xl">Sehr groß (32px)</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
              {block?.data.cellPadding === "custom" && (
                <input
                  type="text"
                  value={block?.data.customCellPadding || ""}
                  onChange={(e) => updateTableSettings({ customCellPadding: e.target.value })}
                  placeholder="z.B. 12px oder 1rem"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 mt-2"
                />
              )}
            </div>
          </div>

          {/* Spaltenbreiten-Einstellungen */}
          {rows.length > 0 && rows[0].cells.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Spaltenbreiten</h4>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows[0].cells.length}, 1fr)` }}>
                {rows[0].cells.map((_cell: any, cellIndex: number) => (
                  <div key={cellIndex} className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Spalte {cellIndex + 1}
                    </label>
                    <input
                      type="text"
                      value={columnWidths[cellIndex] || "auto"}
                      onChange={(e) => updateColumnWidth(cellIndex, e.target.value)}
                      placeholder="z.B. 200px oder 50%"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                    <p className="text-xs text-gray-500">
                      px oder %
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {rows.map((row: any, rowIndex: number) => (
            <div key={rowIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Zeile {rowIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Zeile entfernen
                </button>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${row.cells.length}, 1fr)` }}>
                {row.cells.map((cell: any, cellIndex: number) => (
                  <div
                    key={cellIndex}
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Zelle {rowIndex + 1}-{cellIndex + 1}
                      </span>
                      {rows[0].cells.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(cellIndex)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          title="Spalte entfernen"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    
                    {/* Moderne Rahmen-Stil-Auswahl */}
                    <div className="space-y-2 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rahmen-Stil
                      </label>
                      <select
                        value={cell.borderStyle || "none"}
                        onChange={(e) => {
                          const newBorderStyle = e.target.value;
                          const updates: any = { borderStyle: newBorderStyle };
                          
                          // Entferne customBorderStyle immer, wenn der neue Stil nicht "custom" ist
                          if (newBorderStyle !== "custom") {
                            // Wenn customBorderStyle vorhanden ist, entferne es explizit
                            if (cell.customBorderStyle !== undefined) {
                              // Verwende updateCellStyle, die customBorderStyle automatisch entfernt
                              updateCellStyle(rowIndex, cellIndex, updates);
                            } else {
                              // Kein customBorderStyle vorhanden, einfach borderStyle aktualisieren
                              updateCellStyle(rowIndex, cellIndex, updates);
                            }
                          } else {
                            // Zu "custom" gewechselt - behalte customBorderStyle falls vorhanden
                            updateCellStyle(rowIndex, cellIndex, updates);
                          }
                        }}
                        className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="none">Kein Rahmen</option>
                        <option value="glass">Glass (Glassmorphism)</option>
                        <option value="glow">Glow (Leuchtend)</option>
                        <option value="gradient">Gradient (Farbverlauf)</option>
                        <option value="soft">Soft (Neumorphism)</option>
                        <option value="minimal">Minimal (Dünn)</option>
                        <option value="floating">Floating (Schwebend)</option>
                        <option value="custom">Benutzerdefiniert</option>
                      </select>
                      
                      {cell.borderStyle === "custom" && (
                        <input
                          type="text"
                          value={cell.customBorderStyle || ""}
                          onChange={(e) => updateCellStyle(rowIndex, cellIndex, { 
                            customBorderStyle: e.target.value 
                          })}
                          placeholder="z.B. bg-white border-2 border-rose-500 rounded-lg shadow-lg"
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 mt-1"
                        />
                      )}
                      
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Hintergrundfarbe (optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={cell.backgroundColor?.startsWith("#") ? cell.backgroundColor : "#ffffff"}
                            onChange={(e) => updateCellStyle(rowIndex, cellIndex, { 
                              backgroundColor: e.target.value 
                            })}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            title="Hintergrundfarbe auswählen"
                          />
                          <input
                            type="text"
                            value={cell.backgroundColor || ""}
                            onChange={(e) => updateCellStyle(rowIndex, cellIndex, { 
                              backgroundColor: e.target.value 
                            })}
                            placeholder="#ffffff oder bg-white"
                            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Hex-Farbe (#ffffff) oder Tailwind-Klasse (bg-white)
                        </p>
                      </div>
                    </div>
                    
                    <CellBlocksList
                      rowIndex={rowIndex}
                      cellIndex={cellIndex}
                      blocks={cell.blocks}
                      onUpdateBlock={(blockId, updatedBlock) => updateCellBlock(rowIndex, cellIndex, blockId, updatedBlock)}
                      onRemoveBlock={(blockId) => removeBlockFromCell(rowIndex, cellIndex, blockId)}
                      onMoveBlock={(fromIndex, toIndex) => {
                        const newRows = [...rows];
                        const newCells = [...newRows[rowIndex].cells];
                        const cell = newCells[cellIndex];
                        const movedBlocks = arrayMove(cell.blocks, fromIndex, toIndex);
                        const newCell = {
                          ...cell,
                          blocks: movedBlocks,
                        };
                        newCells[cellIndex] = newCell;
                        newRows[rowIndex] = { ...newRows[rowIndex], cells: newCells };
                        updateTable(newRows);
                      }}
                    />
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addBlockToCell(rowIndex, cellIndex, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="">Block hinzufügen...</option>
                      <option value="text">Text</option>
                      <option value="richText">Formatierter Text</option>
                      <option value="image">Bild</option>
                      <option value="video">Video</option>
                      <option value="hero">Hero</option>
                      <option value="cta">Call to Action</option>
                      <option value="spacer">Abstand</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CellBlockEditorProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onRemove: () => void;
}

function CellBlockEditor({ block, onUpdate, onRemove }: CellBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [richTextModalOpen, setRichTextModalOpen] = useState(false);
  const [textModalAutoOpened, setTextModalAutoOpened] = useState(false);
  const [richTextModalAutoOpened, setRichTextModalAutoOpened] = useState(false);

  // Öffne Modal automatisch, wenn Text- oder RichText-Block in Tabellenzelle erweitert wird (nur einmal)
  useEffect(() => {
    if (block.type === "text" && isExpanded && !textModalOpen && !textModalAutoOpened) {
      setTextModalOpen(true);
      setTextModalAutoOpened(true);
    }
    if (block.type === "richText" && isExpanded && !richTextModalOpen && !richTextModalAutoOpened) {
      setRichTextModalOpen(true);
      setRichTextModalAutoOpened(true);
    }
    // Reset Auto-Opened Flag wenn Block nicht mehr erweitert ist
    if (!isExpanded) {
      setTextModalAutoOpened(false);
      setRichTextModalAutoOpened(false);
    }
  }, [block.type, isExpanded, textModalOpen, richTextModalOpen, textModalAutoOpened, richTextModalAutoOpened]);

  const updateData = (updates: Record<string, any>) => {
    const updatedBlock = {
      ...block,
      data: {
        ...block.data,
        ...updates,
      },
    };
    onUpdate(updatedBlock);
  };

  const handleOpenPicker = (type: "IMAGE" | "VIDEO") => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const handleSelectMedia = (media: { id: string; url: string; type: string; alt?: string }) => {
    if (block.type === "image") {
      const existingMedia = block.data.media || (block.data.src ? { url: block.data.src, alt: block.data.alt || "", caption: block.data.caption || "" } : null);
      updateData({
        media: {
          mediaId: media.id,
          url: media.url,
          alt: media.alt || existingMedia?.alt || "",
          caption: existingMedia?.caption || "",
        },
      });
    } else if (block.type === "video") {
      updateData({
        media: {
          mediaId: media.id,
          url: media.url,
        },
      });
    }
    setPickerOpen(false);
  };

  return (
    <>
      <div className="p-2 bg-white border border-gray-200 rounded text-xs">
        <div className="flex justify-between items-center mb-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-left text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">{block.type}</span>
            {isExpanded ? " (ausklappen)" : " (bearbeiten)"}
          </button>
          <div className="flex gap-1">
            {block.type === "richText" && (
              <button
                type="button"
                onClick={() => setRichTextModalOpen(true)}
                className="text-blue-500 hover:text-blue-700 text-xs"
                title="In größerem Fenster bearbeiten"
              >
                ⛶
              </button>
            )}
            {block.type === "text" && (
              <button
                type="button"
                onClick={() => setTextModalOpen(true)}
                className="text-blue-500 hover:text-blue-700 text-xs"
                title="Im ausgedockten Editor bearbeiten"
              >
                ⛶
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
              title="Block entfernen"
            >
              ×
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="mt-2 space-y-2 border-t pt-2">
            {block.type === "text" && (
              <div className="text-xs text-gray-500 italic">
                Text wird im ausgedockten Editor bearbeitet...
              </div>
            )}
            {block.type === "richText" && (
              <div className="text-xs text-gray-500 italic">
                Formatierter Text wird im ausgedockten Editor bearbeitet...
              </div>
            )}
            {block.type === "image" && (() => {
              const imageMedia = block.data.media || (block.data.src ? { url: block.data.src, alt: block.data.alt || "", caption: block.data.caption || "" } : null);
              const imageUrl = imageMedia?.url || block.data.src;
              const imageAlt = imageMedia?.alt || block.data.alt || "";
              const imageCaption = imageMedia?.caption || block.data.caption || "";
              
              return (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bild
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPicker("IMAGE")}
                        className="px-2 py-1 bg-rose-500 text-white text-xs rounded hover:bg-rose-600 whitespace-nowrap"
                      >
                        {imageUrl ? "Ersetzen" : "Aus Mediathek wählen"}
                      </button>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => updateData({ media: null, src: undefined, alt: undefined, caption: undefined })}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 whitespace-nowrap"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                  </div>
                  {imageUrl && (
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={imageAlt || "Vorschau"}
                        className="w-full max-h-24 object-contain bg-gray-50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alt-Text
                    </label>
                    <input
                      type="text"
                      value={imageAlt}
                      onChange={(e) => {
                        if (imageMedia) {
                          updateData({
                            media: {
                              ...imageMedia,
                              alt: e.target.value,
                            },
                          });
                        } else {
                          updateData({ alt: e.target.value });
                        }
                      }}
                      placeholder="Beschreibung des Bildes"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bildunterschrift
                    </label>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => {
                        if (imageMedia) {
                          updateData({
                            media: {
                              ...imageMedia,
                              caption: e.target.value,
                            },
                          });
                        } else {
                          updateData({ caption: e.target.value });
                        }
                      }}
                      placeholder="Optionale Bildunterschrift"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Ecken abrunden */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ecken abrunden
                    </label>
                    <select
                      value={block.data.rounded || "none"}
                      onChange={(e) => updateData({ rounded: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="none">Keine Rundung</option>
                      <option value="sm">Klein (0.25rem)</option>
                      <option value="md">Mittel (0.5rem)</option>
                      <option value="lg">Groß (1rem)</option>
                      <option value="full">Vollständig (Kreis)</option>
                    </select>
                  </div>

                  {/* Volle Breite */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={block.data.fullWidth || false}
                        onChange={(e) => updateData({ fullWidth: e.target.checked })}
                        className="w-3 h-3 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        Volle Breite
                      </span>
                    </label>
                  </div>

                  {/* Feste Höhe */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Feste Bildhöhe (optional)
                    </label>
                    <input
                      type="text"
                      value={block.data.fixedHeight || ""}
                      onChange={(e) => updateData({ fixedHeight: e.target.value || undefined })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                      placeholder="z.B. 300px oder 50vh"
                    />
                  </div>

                  {/* Rahmen-Stil */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rahmen-Stil
                    </label>
                    <select
                      value={block.data.borderStyle || "none"}
                      onChange={(e) => {
                        const newBorderStyle = e.target.value;
                        const updates: any = { borderStyle: newBorderStyle };
                        // Entferne customBorderStyle, wenn der neue Stil nicht "custom" ist
                        if (newBorderStyle !== "custom") {
                          updates.customBorderStyle = undefined;
                        }
                        updateData(updates);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="none">Kein Rahmen</option>
                      <option value="glass">Glass</option>
                      <option value="glow">Glow</option>
                      <option value="gradient">Gradient</option>
                      <option value="soft">Soft</option>
                      <option value="minimal">Minimal</option>
                      <option value="floating">Floating</option>
                      <option value="custom">Benutzerdefiniert</option>
                    </select>
                    {block.data.borderStyle === "custom" && (
                      <input
                        type="text"
                        value={block.data.customBorderStyle || ""}
                        onChange={(e) => updateData({ customBorderStyle: e.target.value || undefined })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 mt-1"
                        placeholder="CSS-Klassen"
                      />
                    )}
                  </div>

                  {/* Rahmen-Optionen - nur anzeigen wenn ein Rahmen vorhanden ist */}
                  {(block.data.borderStyle && block.data.borderStyle !== "none") && (
                    <>
                      {/* Abstand zwischen Rahmen und Bild */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Abstand zwischen Rahmen und Bild
                        </label>
                        <input
                          type="text"
                          value={block.data.borderPadding ?? "16px"}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            updateData({ borderPadding: value || "16px" });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                          placeholder="z.B. 8px, 16px, 24px"
                        />
                      </div>

                      {/* Rahmenbreite */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rahmenbreite
                        </label>
                        <input
                          type="text"
                          value={block.data.borderWidth ?? ""}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            updateData({ borderWidth: value || undefined });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                          placeholder="z.B. 1px, 2px, 4px (leer = Standard)"
                        />
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            {block.type === "video" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Video-URL
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={block.data.src || ""}
                      onChange={(e) => updateData({ src: e.target.value })}
                      placeholder="/uploads/videos/..."
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenPicker("VIDEO")}
                      className="px-2 py-1 bg-rose-500 text-white text-xs rounded hover:bg-rose-600 whitespace-nowrap"
                    >
                      Medien
                    </button>
                  </div>
                </div>
                {block.data.src && (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <video
                      src={block.data.src}
                      controls
                      className="w-full max-h-24 bg-gray-50"
                    >
                      Dein Browser unterstützt das Video-Element nicht.
                    </video>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={block.data.title || ""}
                    onChange={(e) => updateData({ title: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </>
            )}
            {block.type === "hero" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Überschrift
                  </label>
                  <input
                    type="text"
                    value={block.data.heading || ""}
                    onChange={(e) => updateData({ heading: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Untertitel
                  </label>
                  <input
                    type="text"
                    value={block.data.subheading || ""}
                    onChange={(e) => updateData({ subheading: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ausrichtung
                  </label>
                  <select
                    value={block.data.align || "center"}
                    onChange={(e) => updateData({ align: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="left">Links</option>
                    <option value="center">Zentriert</option>
                    <option value="right">Rechts</option>
                  </select>
                </div>
              </>
            )}
            {block.type === "cta" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Überschrift
                  </label>
                  <input
                    type="text"
                    value={block.data.heading || ""}
                    onChange={(e) => updateData({ heading: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Text
                  </label>
                    <textarea
                      value={block.data.text || ""}
                      onChange={(e) => updateData({ text: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button-Text
                  </label>
                  <input
                    type="text"
                    value={block.data.buttonLabel || ""}
                    onChange={(e) => updateData({ buttonLabel: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Button-Link
                  </label>
                  <input
                    type="url"
                    value={block.data.buttonHref || ""}
                    onChange={(e) => updateData({ buttonHref: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </>
            )}
            {block.type === "spacer" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Größe
                </label>
                <select
                  value={block.data.size || "md"}
                  onChange={(e) => updateData({ size: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
                >
                  <option value="sm">Klein</option>
                  <option value="md">Mittel</option>
                  <option value="lg">Groß</option>
                  <option value="xl">Sehr groß</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type={pickerType.toLowerCase() as "image" | "video"}
        onSelect={handleSelectMedia}
      />
      {textModalOpen && (
        <TextEditorModal
          block={block}
          onChange={onUpdate}
          onClose={() => setTextModalOpen(false)}
        />
      )}
      {richTextModalOpen && (
        <RichTextEditorModal
          block={block}
          onChange={onUpdate}
          onClose={() => setRichTextModalOpen(false)}
        />
      )}
    </>
  );
}

interface RichTextCellEditorProps {
  block: Block;
  onUpdate: (updates: Record<string, any>) => void;
}

function RichTextCellEditor({ block, onUpdate }: RichTextCellEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Speichere Cursor-Position
  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    return {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
    };
  };

  // Stelle Cursor-Position wieder her
  const restoreSelection = (savedSelection: any) => {
    if (!savedSelection || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      range.setStart(savedSelection.startContainer, savedSelection.startOffset);
      range.setEnd(savedSelection.endContainer, savedSelection.endOffset);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      // Falls Wiederherstellung fehlschlägt, setze Cursor ans Ende
      const selection = window.getSelection();
      if (selection && editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Initialisiere HTML beim ersten Render
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML.trim();
      const blockHtml = block.data.html || "<p></p>";
      if (currentHtml !== blockHtml && !isInternalUpdateRef.current) {
        editorRef.current.innerHTML = blockHtml;
      } else if (!currentHtml) {
        editorRef.current.innerHTML = blockHtml;
      }
    }
  }, [block.id]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Speichere Cursor-Position vor Update
    const savedSelection = saveSelection();
    const newHtml = e.currentTarget.innerHTML;
    isInternalUpdateRef.current = true;
    onUpdate({ html: newHtml });
    // Stelle Cursor-Position nach Update wieder her
    requestAnimationFrame(() => {
      if (savedSelection && editorRef.current) {
        restoreSelection(savedSelection);
      }
      isInternalUpdateRef.current = false;
    });
  };

  // Entferne alle span-Tags mit fontSize rekursiv aus einem Element
  const removeFontSizeSpans = (element: Node): Node => {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.cloneNode(true);
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
      return element.cloneNode(true);
    }

    const el = element as HTMLElement;
    
    // Wenn es ein span mit fontSize ist, entferne den span aber behalte den Inhalt
    if (el.tagName === "SPAN" && el.style.fontSize) {
      const fragment = document.createDocumentFragment();
      while (el.firstChild) {
        const cleaned = removeFontSizeSpans(el.firstChild);
        if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          const frag = cleaned as DocumentFragment;
          while (frag.firstChild) {
            fragment.appendChild(frag.firstChild);
          }
        } else {
          fragment.appendChild(cleaned);
        }
      }
      return fragment;
    }

    // Für andere Elemente, klone sie und bereinige die Kinder
    const cloned = el.cloneNode(false) as HTMLElement;
    for (let i = 0; i < el.childNodes.length; i++) {
      const cleaned = removeFontSizeSpans(el.childNodes[i]);
      if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        const fragment = cleaned as DocumentFragment;
        while (fragment.firstChild) {
          cloned.appendChild(fragment.firstChild);
        }
      } else {
        cloned.appendChild(cleaned);
      }
    }
    return cloned;
  };

  // Wende Schriftgröße auf markierten Text an
  const applyFontSize = (size: string) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // Kein Text markiert

    // Prüfe ob die Range im Editor liegt
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const fontSizeMap: Record<string, string> = {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px
      md: "1rem",       // 16px
      lg: "1.125rem",   // 18px
      xl: "1.25rem",    // 20px
      "2xl": "1.5rem",  // 24px
      "3xl": "1.875rem", // 30px
    };

    const fontSize = size === "custom" && block?.data.customFontSize 
      ? block.data.customFontSize 
      : fontSizeMap[size] || fontSizeMap.md;

    // Speichere die Range-Position relativ zum Editor
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Extrahiere den Inhalt
    const contents = range.extractContents();
    
    // Entferne alle fontSize-Spans aus dem extrahierten Inhalt
    const cleaned = removeFontSizeSpans(contents);
    
    // Erstelle neuen span mit Schriftgröße
    const span = document.createElement("span");
    span.style.fontSize = fontSize;
    
    // Füge den bereinigten Inhalt in den neuen span ein
    if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const fragment = cleaned as DocumentFragment;
      while (fragment.firstChild) {
        span.appendChild(fragment.firstChild);
      }
    } else {
      span.appendChild(cleaned);
    }
    
    // Füge den span in die Range ein
    range.insertNode(span);
    
    // Stelle die Markierung wieder her
    try {
      const newRange = document.createRange();
      newRange.setStart(span, 0);
      newRange.setEnd(span, span.childNodes.length);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch (e) {
      // Falls das nicht funktioniert, markiere den gesamten span
      try {
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e2) {
        console.error("Could not restore selection:", e2);
      }
    }
    
    // Aktualisiere HTML
    const newHtml = editorRef.current.innerHTML;
    isInternalUpdateRef.current = true;
    onUpdate({ html: newHtml });
    isInternalUpdateRef.current = false;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs font-medium text-gray-700">
          Formatierter Text
        </label>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-2 p-1 border border-gray-200 rounded bg-gray-50">
        <button
          type="button"
          onClick={() => document.execCommand("bold", false)}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
          title="Fett"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("italic", false)}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
          title="Kursiv"
        >
          I
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <select
          onChange={(e) => {
            if (e.target.value) {
              applyFontSize(e.target.value);
              e.target.value = ""; // Reset
            }
          }}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 focus:ring-2 focus:ring-rose-500"
          title="Schriftgröße"
        >
          <option value="">A</option>
          <option value="xs">Sehr klein</option>
          <option value="sm">Klein</option>
          <option value="md">Mittel</option>
          <option value="lg">Groß</option>
          <option value="xl">Größer</option>
          <option value="2xl">Sehr groß</option>
          <option value="3xl">Extra groß</option>
        </select>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL eingeben:");
            if (url) document.execCommand("createLink", false, url);
          }}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Link"
        >
          🔗
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            document.execCommand("justifyLeft", false);
            if (editorRef.current) {
              const newHtml = editorRef.current.innerHTML;
              isInternalUpdateRef.current = true;
              onUpdate({ html: newHtml });
              isInternalUpdateRef.current = false;
            }
          }}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Links ausrichten"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => {
            document.execCommand("justifyCenter", false);
            if (editorRef.current) {
              const newHtml = editorRef.current.innerHTML;
              isInternalUpdateRef.current = true;
              onUpdate({ html: newHtml });
              isInternalUpdateRef.current = false;
            }
          }}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Zentrieren"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => {
            document.execCommand("justifyRight", false);
            if (editorRef.current) {
              const newHtml = editorRef.current.innerHTML;
              isInternalUpdateRef.current = true;
              onUpdate({ html: newHtml });
              isInternalUpdateRef.current = false;
            }
          }}
          className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Rechts ausrichten"
        >
          ➡
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        className="w-full min-h-[100px] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-rose-500 focus:outline-none prose prose-sm max-w-none"
        style={{ whiteSpace: "pre-wrap" }}
      />
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          HTML bearbeiten
        </summary>
        <textarea
          value={block.data.html || ""}
          onChange={(e) => {
            isInternalUpdateRef.current = true;
            onUpdate({ html: e.target.value });
            if (editorRef.current) {
              editorRef.current.innerHTML = e.target.value || "<p></p>";
            }
            isInternalUpdateRef.current = false;
          }}
          rows={3}
          className="w-full mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs font-mono"
        />
      </details>
    </div>
  );
}

interface RichTextEditorProps extends BlockEditorProps {
  compact?: boolean;
}

function RichTextEditor({ block, onChange, compact = false }: RichTextEditorProps) {
  const handleChange = (html: string) => {
    onChange({
      ...block!,
      data: {
        ...block!.data,
        html,
      },
    });
  };

  return (
    <div className="space-y-4">
      {!compact && <h3 className="text-lg font-semibold text-gray-900">Formatierter Text Block</h3>}
      <TinyMCEBlockEditor
        key={block?.id}
        content={block?.data.html || "<p></p>"}
        onChange={handleChange}
        compact={compact}
      />
    </div>
  );
}

interface TextEditorModalProps {
  block: Block;
  onChange: (block: Block) => void;
  onClose: () => void;
}

function TextEditorModal({ block, onChange, onClose }: TextEditorModalProps) {
  const [text, setText] = useState(block.data.text || "");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const handleSave = () => {
    onChange({
      ...block,
      data: { text },
    });
    onClose();
  };

  const handleOptimize = async () => {
    if (!text.trim()) {
      setOptimizeError("Kein Text zum Optimieren vorhanden");
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      const response = await fetch("/api/optimize-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Optimieren");
      }

      const data = await response.json();
      if (data.optimizedHtml) {
        setText(data.optimizedHtml);
      } else {
        throw new Error("Keine optimierte HTML-Antwort erhalten");
      }
    } catch (error: any) {
      console.error("Optimize error:", error);
      setOptimizeError(error.message || "Fehler beim Optimieren des HTML-Codes");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Text Block bearbeiten</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !text.trim()}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              title="HTML-Code mit ChatGPT optimieren"
            >
              {isOptimizing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Optimiere...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  HTML optimieren
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
        <div className="flex-1 overflow-y-auto p-6">
          {optimizeError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {optimizeError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOptimizeError(null);
              }}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Gib deinen Text ein..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

interface RichTextEditorModalProps {
  block: Block;
  onChange: (block: Block) => void;
  onClose: () => void;
}

function RichTextEditorModal({ block, onChange, onClose }: RichTextEditorModalProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [localHtml, setLocalHtml] = useState<string | null>(null);

  // Initialisiere localHtml mit dem Block-HTML
  useEffect(() => {
    if (localHtml === null) {
      setLocalHtml(block?.data.html || "<p></p>");
    }
  }, [block?.data.html, localHtml]);

  const handleOptimize = async () => {
    const currentHtml = localHtml || block?.data.html || "";
    if (!currentHtml.trim() || currentHtml === "<p></p>") {
      setOptimizeError("Kein HTML-Code zum Optimieren vorhanden");
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      const response = await fetch("/api/optimize-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html: currentHtml }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Optimieren");
      }

      const data = await response.json();
      if (data.optimizedHtml) {
        // Speichere den optimierten HTML nur lokal, nicht sofort
        setLocalHtml(data.optimizedHtml);
      } else {
        throw new Error("Keine optimierte HTML-Antwort erhalten");
      }
    } catch (error: any) {
      console.error("Optimize error:", error);
      setOptimizeError(error.message || "Fehler beim Optimieren des HTML-Codes");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = () => {
    // Speichere den aktuellen HTML-Code (lokal oder aus dem Block)
    const htmlToSave = localHtml || block?.data.html || "<p></p>";
    onChange({
      ...block!,
      data: {
        ...block!.data,
        html: htmlToSave,
      },
    });
    setLocalHtml(null); // Reset localHtml nach dem Speichern
    setOptimizeError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Formatierter Text Block bearbeiten</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !block?.data.html || block.data.html === "<p></p>"}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              title="HTML-Code mit ChatGPT optimieren"
            >
              {isOptimizing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Optimiere...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  HTML optimieren
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
        <div className="flex-1 overflow-y-auto p-6">
          {optimizeError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {optimizeError}
            </div>
          )}
          <RichTextEditor 
            block={{
              ...block!,
              data: {
                ...block!.data,
                html: localHtml || block?.data.html || "<p></p>",
              },
            }} 
            onChange={(updatedBlock) => {
              // Wenn der Editor geändert wird, aktualisiere localHtml
              setLocalHtml(updatedBlock.data.html);
            }} 
            compact={false} 
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOptimizeError(null);
              setLocalHtml(null); // Reset localHtml beim Abbrechen
              onClose();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}



// Einfache Drag-and-Drop-Komponente für Blöcke innerhalb von Tabellenzellen
interface CellBlocksListProps {
  rowIndex: number;
  cellIndex: number;
  blocks: Block[];
  onUpdateBlock: (blockId: string, updatedBlock: Block) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
}

function CellBlocksList({
  blocks,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}: CellBlocksListProps) {
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Verhindere Hydration-Mismatch durch Client-Only Rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const blockIds = blocks.map((b) => b.id);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId !== overId) {
      const oldIndex = blocks.findIndex((b) => b.id === activeId);
      const newIndex = blocks.findIndex((b) => b.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveBlock(oldIndex, newIndex);
      }
    }
  };

  if (blocks.length === 0) {
    return null;
  }

  // Während SSR, zeige leeren Container (verhindert Hydration-Mismatch)
  if (!mounted) {
    return <div className="space-y-2 mb-2" />;
  }

  return (
    <div className="space-y-2 mb-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          {blocks.map((cellBlock) => (
            <SortableCellBlockItem
              key={cellBlock.id}
              block={cellBlock}
              onUpdate={(updatedBlock) => onUpdateBlock(cellBlock.id, updatedBlock)}
              onRemove={() => onRemoveBlock(cellBlock.id)}
              isDragging={isDragging}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableCellBlockItemProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onRemove: () => void;
  isDragging: boolean;
}

function SortableCellBlockItem({ block, onUpdate, onRemove, isDragging: isDraggingAny }: SortableCellBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Zum Verschieben ziehen"
          type="button"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {/* Block Editor */}
        <div className="flex-1" style={{ pointerEvents: isDraggingAny || isDragging ? 'none' : 'auto' }}>
          <CellBlockEditor
            block={block}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}