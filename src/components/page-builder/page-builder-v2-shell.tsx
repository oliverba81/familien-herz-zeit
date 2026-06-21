"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WysiwygEditor, type WysiwygEditorHandle } from "@/vendor/wysiwyg-editor/react";
import type { Editor as WysiwygCore } from "@/vendor/wysiwyg-editor/core/Editor";
import { V2_TOOLBAR } from "@/lib/wysiwyg/toolbars";
import { uploadImageToMedia } from "@/lib/wysiwyg/upload-image";
import type { PageContentV2 } from "@/lib/page-builder/schema";
import { isPageContentV2 } from "@/lib/page-builder/schema";
import {
  STYLE_PRESETS,
  getStylePresetsByCategory,
  getCategoryLabel,
  type StylePreset,
  type StylePresetCategory,
} from "@/lib/page-builder/style-presets";
import {
  V2_EMBED_BLOCK_TYPES,
  V2_BLOCK_ICONS,
  V2_BLOCK_LABELS,
  getV2EmbedPlaceholderHtml,
  getV2EmbedDefaultData,
  parseEmbedDataFromAttribute,
  updateEmbedDataInHtml,
  type V2EmbedBlockType,
} from "@/lib/page-builder/v2-embed-defaults";
import type { Block } from "@/lib/page-builder/types";
import { Copy, Send, X } from "lucide-react";
import MediaPickerModal from "@/components/media/media-picker-modal";
import BlockEditor from "@/components/page-builder/block-editor";

interface PageBuilderV2ShellProps {
  /** Bei neuen Seiten (Create) nicht gesetzt; dann wird nur der Editor angezeigt, Speichern erfolgt über das Formular. */
  pageId?: string;
  initialContentJson: unknown;
  pageSlug?: string;
  pagePublished?: boolean;
  onSave: (content: PageContentV2) => Promise<void>;
  /** Wird bei jeder Änderung aufgerufen (z. B. im Create-Modus), damit das Formular den Inhalt übernehmen kann. */
  onChange?: (content: PageContentV2) => void;
  additionalFields?: {
    published?: boolean;
    showTitle?: boolean;
    containerWidth?: string;
    customCss?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    ogImageUrl?: string | null;
    title?: string;
    slug?: string;
  };
  onAdditionalFieldsChange?: (fields: {
    published?: boolean;
    showTitle?: boolean;
    containerWidth?: string;
    customCss?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    ogImageUrl?: string | null;
    title?: string;
    slug?: string;
  }) => void;
  /** Optional: Ref, damit die Parent-Form den aktuellen WYSIWYG-HTML lesen kann (z. B. für KI-Kontext). */
  currentHtmlRef?: React.MutableRefObject<(() => string) | null>;
}

const isCreateMode = (id: string | undefined) => id === undefined || id === "";

/**
 * Ermittelt das aktuell „aktive" Element im Editor (Ersatz für TinyMCEs
 * `editor.selection.getNode()`). Bevorzugt die Text-Selection; fällt auf das
 * zuletzt angeklickte Element zurück, da Bilder/`contenteditable=false`-Embeds
 * beim Anklicken keine Text-Selection erzeugen.
 */
function getSelectedElement(
  e: WysiwygCore,
  lastClicked: HTMLElement | null
): HTMLElement | null {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    let n: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
    if (n && e.editorEl.contains(n) && n !== e.editorEl) {
      return n as HTMLElement;
    }
  }
  if (lastClicked && e.editorEl.contains(lastClicked) && lastClicked !== e.editorEl) {
    return lastClicked;
  }
  return null;
}

export default function PageBuilderV2Shell({
  pageId,
  initialContentJson,
  pageSlug,
  pagePublished = false,
  onSave,
  onChange,
  additionalFields,
  onAdditionalFieldsChange,
  currentHtmlRef,
}: PageBuilderV2ShellProps) {
  const router = useRouter();
  const editorRef = useRef<WysiwygEditorHandle>(null);
  /** Liefert die Core-Editor-Instanz (insertHTML/editorEl/commands leben nur dort). */
  const ed = useCallback(() => editorRef.current?.getEditor() ?? null, []);
  /** Zuletzt im Editor angeklicktes Element (Fallback für Stylevorlagen auf Bilder/Embeds). */
  const lastClickedElRef = useRef<HTMLElement | null>(null);
  const createMode = isCreateMode(pageId);

  const initialHtml =
    isPageContentV2(initialContentJson) && typeof initialContentJson.html === "string"
      ? initialContentJson.html
      : "";

  const [html, setHtml] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(pagePublished);
  const [lastSavedHtml, setLastSavedHtml] = useState<string | null>(null);
  const [lastSavedAdditionalFields, setLastSavedAdditionalFields] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const openMediaPickerRef = useRef<() => void>(() => {});

  /** Ausgewählter V2-Embed-Block (zum Konfigurieren in der Sidebar). */
  const [selectedEmbed, setSelectedEmbed] = useState<{
    blockId: string;
    blockType: V2EmbedBlockType;
    data: Record<string, unknown>;
  } | null>(null);
  const onSelectEmbedRef = useRef<(payload: typeof selectedEmbed) => void>(() => {});
  useEffect(() => {
    onSelectEmbedRef.current = setSelectedEmbed;
  }, []);

  // Parent kann aktuellen WYSIWYG-Inhalt lesen (z. B. für „Mit KI ausfüllen“)
  // Fallback: React-State, bis der Editor bereit ist (dann in setup durch Editor-Instanz ersetzt)
  useEffect(() => {
    if (currentHtmlRef) {
      currentHtmlRef.current = () => html;
      return () => {
        currentHtmlRef.current = null;
      };
    }
  }, [currentHtmlRef, html]);

  // Im Create-Modus: Parent-Formular mit aktuellem Inhalt synchron halten (nur von html abhängig, um Loops zu vermeiden)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (createMode) {
      onChangeRef.current?.({ version: 2, html });
    }
  }, [createMode, html]);

  useEffect(() => {
    // Synchronisiert isPublished aus den Props; der Wert wird zusätzlich von
    // handlePublish gesetzt (gemischter State).
    if (additionalFields?.published !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPublished(additionalFields.published);
    }
  }, [additionalFields?.published]);

  const currentAdditionalFieldsHash = additionalFields ? JSON.stringify(additionalFields) : null;
  const fieldsDirty =
    lastSavedAdditionalFields !== null &&
    currentAdditionalFieldsHash !== null &&
    currentAdditionalFieldsHash !== lastSavedAdditionalFields;
  const isDirty =
    (lastSavedHtml !== null && lastSavedHtml !== html) || fieldsDirty;

  useEffect(() => {
    // Einmalige Initialisierung des lastSavedHtml für das Dirty-Tracking.
    if (lastSavedHtml === null && initialHtml !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSavedHtml(initialHtml);
    }
  }, [initialHtml, lastSavedHtml]);

  useEffect(() => {
    // Einmalige Initialisierung des additionalFields-Hashes für das Dirty-Tracking.
    if (additionalFields && lastSavedHtml !== null && lastSavedAdditionalFields === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSavedAdditionalFields(JSON.stringify(additionalFields));
    }
  }, [additionalFields, lastSavedHtml, lastSavedAdditionalFields]);

  useEffect(() => {
    openMediaPickerRef.current = () => setMediaPickerOpen(true);
  }, []);

  const handleMediaSelect = useCallback(
    (media: { id: string; url: string; type: string; alt?: string }) => {
      const e = ed();
      if (!e) return;
      const altEsc = (media.alt || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const srcEsc = media.url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      e.insertHTML(`<img src="${srcEsc}" alt="${altEsc}" />`);
      setMediaPickerOpen(false);
    },
    [ed]
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const showApplyMessage = useCallback((text: string) => {
    setApplyMessage(text);
    setTimeout(() => setApplyMessage(null), 2500);
  }, []);

  const applyStylePreset = useCallback(
    (preset: StylePreset) => {
      const e = ed();
      if (!e) {
        showApplyMessage("Editor nicht bereit.");
        return;
      }
      try {
        const node = getSelectedElement(e, lastClickedElRef.current);
        if (!node) {
          showApplyMessage("Bitte zuerst ein Element (Absatz, Bild, Tabelle) im Editor auswählen.");
          return;
        }
        node.classList.add(preset.className);
        // DOM-Mutation per JS löst kein input/onChange aus → React-State manuell syncen.
        setHtml(e.getHTML());
        showApplyMessage(`Vorlage „${preset.label}" angewendet.`);
      } catch (err) {
        showApplyMessage("Vorlage konnte nicht angewendet werden.");
      }
    },
    [ed, showApplyMessage]
  );

  const insertBlockPlaceholder = useCallback(
    (blockType: V2EmbedBlockType) => {
      const e = ed();
      if (!e) {
        showApplyMessage("Editor nicht bereit.");
        return;
      }
      try {
        const defaultData = getV2EmbedDefaultData(blockType);
        const snippet = getV2EmbedPlaceholderHtml(blockType, defaultData);
        e.insertHTML(snippet);
        showApplyMessage(`${V2_BLOCK_LABELS[blockType]} eingefügt. Klicke den Block an, um ihn zu konfigurieren.`);
      } catch (err) {
        showApplyMessage("Block konnte nicht eingefügt werden.");
      }
    },
    [ed, showApplyMessage]
  );

  const handleEmbedBlockChange = useCallback(
    (updatedBlock: Block) => {
      const newHtml = updateEmbedDataInHtml(html, updatedBlock.id, updatedBlock.data);
      setHtml(newHtml);
      setSelectedEmbed((prev) =>
        prev && prev.blockId === updatedBlock.id
          ? { ...prev, data: updatedBlock.data }
          : prev
      );
    },
    [html]
  );

  const handleEditorReady = useCallback(() => {
    const e = editorRef.current?.getEditor();
    if (!e) return;

    // Custom-Befehl für den statischen Toolbar-Button "fhzMedia".
    if (!e.commands.has("fhzMedia")) {
      e.commands.register("fhzMedia", () => openMediaPickerRef.current?.());
    }

    // Aktuellen Inhalt direkt aus der Editor-Instanz lesen (z. B. für „Mit KI ausfüllen").
    if (currentHtmlRef) {
      currentHtmlRef.current = () => editorRef.current?.getHTML() ?? "";
    }

    // Ersatz für TinyMCEs "NodeChange": Klick im Editor erkennt FHZ-Embed-Blöcke.
    // (contenteditable=false-Embeds erzeugen keine Text-Selection → Click-Listener nötig.)
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      lastClickedElRef.current = target;
      const embed = target?.closest?.(".fhz-embed") as HTMLElement | null;
      if (embed) {
        const bid = embed.getAttribute("data-fhz-block-id");
        const btype = embed.getAttribute("data-fhz-block");
        const dataRaw = embed.getAttribute("data-fhz-block-data");
        if (bid && btype && V2_EMBED_BLOCK_TYPES.includes(btype as V2EmbedBlockType)) {
          const data =
            parseEmbedDataFromAttribute(dataRaw) ??
            getV2EmbedDefaultData(btype as V2EmbedBlockType);
          onSelectEmbedRef.current?.({
            blockId: bid,
            blockType: btype as V2EmbedBlockType,
            data,
          });
          return;
        }
      }
      onSelectEmbedRef.current?.(null);
    };
    e.editorEl.addEventListener("click", onClick);
    e.on("destroy", () => e.editorEl.removeEventListener("click", onClick));
  }, [currentHtmlRef]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const styleData = e.dataTransfer.getData("application/x-style-preset");
      const blockData = e.dataTransfer.getData("application/x-fhz-block");
      if (styleData) {
        try {
          const { id } = JSON.parse(styleData) as { id: string };
          const preset = STYLE_PRESETS.find((p) => p.id === id);
          if (preset) applyStylePreset(preset);
        } catch (_) {}
      } else if (blockData) {
        try {
          const { blockType } = JSON.parse(blockData) as { blockType: V2EmbedBlockType };
          if (V2_EMBED_BLOCK_TYPES.includes(blockType)) {
            insertBlockPlaceholder(blockType);
          }
        } catch (_) {}
      }
    },
    [applyStylePreset, insertBlockPlaceholder]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave({ version: 2, html });
      setLastSavedHtml(html);
      if (additionalFields) {
        setLastSavedAdditionalFields(JSON.stringify(additionalFields));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pageId) return;
    setPublishing(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Veröffentlichen");
      }
      setIsPublished(true);
      if (onAdditionalFieldsChange) onAdditionalFieldsChange({ published: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Fehler beim Veröffentlichen");
    } finally {
      setPublishing(false);
    }
  };

  const presetsByCategory = getStylePresetsByCategory();
  const categories = Array.from(presetsByCategory.keys());

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">WYSIWYG-Builder</h2>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {isPublished ? "Veröffentlicht" : "Entwurf"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-sm text-orange-800 font-medium">Ungespeichert</span>
            </div>
          )}
          {applyMessage && (
            <span className="text-sm text-gray-600" role="status">
              {applyMessage}
            </span>
          )}
          {saveSuccess && <span className="text-sm text-green-600">✓ Gespeichert</span>}
          {saveError && <span className="text-sm text-red-600">{saveError}</span>}
          <div className="flex items-center gap-2">
            {createMode ? (
              <span className="text-sm text-gray-500">
                Speichere die Seite mit dem Button „Speichern“ unten im Formular.
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveDraft();
                  }}
                  disabled={saving || !isDirty}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? "Wird gespeichert..." : <><Copy className="w-4 h-4" /> Speichern</>}
                </button>
                {!isPublished && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePublish();
                    }}
                    disabled={publishing}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {publishing ? "Wird veröffentlicht..." : <><Send className="w-4 h-4" /> Veröffentlichen</>}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push("/admin/pages");
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Schließen
            </button>
          </div>
        </div>
      </div>

      {/* Main: Editor + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="v2-builder-canvas flex-1 overflow-hidden border-r border-gray-200">
            <WysiwygEditor
              ref={editorRef}
              value={html}
              onChange={(newHtml) => setHtml(newHtml)}
              onReady={handleEditorReady}
              toolbar={V2_TOOLBAR}
              locale="de"
              height="100%"
              onChangeDebounceMs={0}
              dragDrop={false}
              onImageUpload={uploadImageToMedia}
              className="h-full"
              // Gleiche Darstellung wie die veröffentlichte Seite (PageRendererHtml-Wrapper):
              // Schrift, Überschriften, Links, Tabellen aus globals.css `.tinymce-preview-content`.
              editorClass="tinymce-preview-content prose max-w-none text-md"
            />
          </div>
        </div>

        {mediaPickerOpen && (
          <MediaPickerModal
            open={true}
            onClose={() => setMediaPickerOpen(false)}
            type="image"
            onSelect={handleMediaSelect}
          />
        )}

        {/* Right: Block-Konfiguration (wenn Block ausgewählt) + Stylevorlagen + Inhaltsblöcke */}
        <div className="w-[320px] shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto flex flex-col">
          {selectedEmbed ? (
            <div className="p-3 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Block konfigurieren
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {V2_BLOCK_LABELS[selectedEmbed.blockType]}
              </p>
              <div className="max-h-[50vh] overflow-y-auto">
                <BlockEditor
                  block={{
                    id: selectedEmbed.blockId,
                    type: selectedEmbed.blockType,
                    data: selectedEmbed.data,
                  }}
                  onChange={handleEmbedBlockChange}
                />
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-gray-200">
              <p className="text-xs text-gray-500">
                Klicke im Editor auf einen Inhaltsblock (Kurse, Termine, …), um ihn hier zu konfigurieren.
              </p>
            </div>
          )}
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Stylevorlagen</h3>
            <p className="text-xs text-gray-500 mb-3">
              Ziehe eine Vorlage auf den Editor oder wähle ein Element und klicke auf die Vorlage.
            </p>
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat}>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    {getCategoryLabel(cat)}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(presetsByCategory.get(cat) ?? []).map((preset) => (
                      <span
                        key={preset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-style-preset",
                            JSON.stringify({ id: preset.id, className: preset.className, label: preset.label })
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => applyStylePreset(preset)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs cursor-grab active:cursor-grabbing hover:border-rose-400 hover:bg-rose-50"
                      >
                        {preset.icon && <span>{preset.icon}</span>}
                        {preset.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Inhaltsblöcke</h3>
            <p className="text-xs text-gray-500 mb-3">
              Ziehe auf den Editor oder klicke, um an der Cursor-Position einzufügen.
            </p>
            <div className="space-y-2">
              {V2_EMBED_BLOCK_TYPES.map((blockType) => (
                <div
                  key={blockType}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-fhz-block",
                      JSON.stringify({ blockType })
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => insertBlockPlaceholder(blockType)}
                  className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded-lg cursor-grab active:cursor-grabbing hover:border-rose-400 hover:bg-rose-50"
                >
                  <span className="text-lg">{V2_BLOCK_ICONS[blockType]}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {V2_BLOCK_LABELS[blockType]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
