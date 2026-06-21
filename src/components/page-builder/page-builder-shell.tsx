"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContentV1, parsePageContent, pageContentSchemaV1, createEmptyContent } from "@/lib/page-builder/schema";
import { useBuilderState } from "./builder-state";
import BlockLibrary from "./block-library";
import Canvas from "./canvas";
import Inspector from "./inspector";
import ValidationPanel from "./validation-panel";
import { Edit, Copy, Send, X, Undo2, Redo2 } from "lucide-react";
import { contentHash } from "@/lib/page-builder/hash";
import { useAutosave } from "./use-autosave";
import { validateContent } from "@/lib/page-builder/validate";

// Helper: Format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  return "vor längerer Zeit";
}

interface PageBuilderShellProps {
  pageId: string;
  initialContentJson: any;
  pageSlug?: string;
  pagePublished?: boolean;
  onSave: (content: PageContentV1) => Promise<void>;
  // Zusätzliche Felder, die auch gespeichert werden müssen
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
}

export default function PageBuilderShell({
  pageId,
  initialContentJson,
  pageSlug,
  pagePublished = false,
  onSave,
  additionalFields,
  onAdditionalFieldsChange,
}: PageBuilderShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(pagePublished);

  // Update isPublished when additionalFields.published changes
  useEffect(() => {
    // Synchronisiert isPublished aus den Props; der Wert wird zusätzlich von
    // handlePublish/handleUnpublish gesetzt (gemischter State).
    if (additionalFields?.published !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPublished(additionalFields.published);
    }
  }, [additionalFields?.published]);

  // Parse initial content with recovery info
  const parseResult = parsePageContent(initialContentJson, true);
  const initialContent = parseResult.content;
  const [recoveryInfo, setRecoveryInfo] = useState(parseResult.recovery);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const {
    content,
    selectedBlockId,
    canUndo,
    canRedo,
    selectBlock,
    addBlock,
    addTemplate,
    updateBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    moveBlockById,
    addReusable,
    pasteBlock,
    undo,
    redo,
  } = useBuilderState(initialContent);

  // Dirty State Tracking
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedAdditionalFields, setLastSavedAdditionalFields] = useState<string | null>(null);

  useEffect(() => {
    // Initial: Setze lastSavedHash beim ersten Laden (einmalige Mount-Initialisierung
    // des Dirty-Trackings).
    if (lastSavedHash === null) {
      const hash = contentHash(initialContent);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSavedHash(hash);
      setLastSavedAt(new Date());
      // Speichere auch initial additionalFields Hash
      if (additionalFields) {
        const fieldsHash = JSON.stringify(additionalFields);
        setLastSavedAdditionalFields(fieldsHash);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mount

  // Update additionalFields hash when they change (for initial load)
  useEffect(() => {
    // Einmalige Initialisierung des additionalFields-Hashes für das Dirty-Tracking.
    if (additionalFields && lastSavedAdditionalFields === null) {
      const fieldsHash = JSON.stringify(additionalFields);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSavedAdditionalFields(fieldsHash);
    }
  }, [additionalFields, lastSavedAdditionalFields]);

  const currentHash = contentHash(content);
  const currentAdditionalFieldsHash = additionalFields ? JSON.stringify(additionalFields) : null;
  const contentDirty = lastSavedHash !== null && currentHash !== lastSavedHash;
  const fieldsDirty = lastSavedAdditionalFields !== null && 
    currentAdditionalFieldsHash !== null && 
    currentAdditionalFieldsHash !== lastSavedAdditionalFields;
  const isDirty = contentDirty || fieldsDirty;

  // Autosave
  useAutosave({
    enabled: isDirty,
    intervalMs: 25000, // 25 Sekunden
    isDirty,
    isSaving: saving,
    saveDraft: async () => {
      await handleSaveDraft();
      // Hash wird bereits in handleSaveDraft aktualisiert
    },
  });

  // beforeunload Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        return ""; // Required for Safari
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Keyboard Shortcuts: Undo/Redo + Move
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (immer aktiv, auch in Inputs)
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === "z" || e.key === "Z") {
          if (e.shiftKey) {
            // Ctrl+Shift+Z = Redo
            e.preventDefault();
            e.stopPropagation();
            if (canRedo) {
              redo();
            }
          } else {
            // Ctrl+Z = Undo
            e.preventDefault();
            e.stopPropagation();
            if (canUndo) {
              undo();
            }
          }
          return;
        } else if (e.key === "y" || e.key === "Y") {
          // Ctrl+Y = Redo
          e.preventDefault();
          e.stopPropagation();
          if (canRedo) {
            redo();
          }
          return;
        }
      }

      // Copy: Ctrl+C / Cmd+C (nur wenn Block ausgewählt und nicht in Input)
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInput = activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.getAttribute("contenteditable") === "true");
        
        if (!isInput && selectedBlockId) {
          const block = content.blocks.find(b => b.id === selectedBlockId);
          if (block) {
            e.preventDefault();
            e.stopPropagation();
            const blockJson = JSON.stringify(block, null, 2);
            navigator.clipboard.writeText(blockJson).catch(() => {
              // Fallback für ältere Browser
              const textArea = document.createElement("textarea");
              textArea.value = blockJson;
              textArea.style.position = "fixed";
              textArea.style.opacity = "0";
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand("copy");
              document.body.removeChild(textArea);
            });
          }
        }
        return;
      }

      // Paste: Ctrl+V / Cmd+V (nur wenn nicht in Input)
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInput = activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.getAttribute("contenteditable") === "true");
        
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.readText().then(text => {
            try {
              const block = JSON.parse(text);
              // Validiere, dass es ein Block ist
              if (block && block.type && block.data) {
                pasteBlock(block);
              }
            } catch (error) {
              // Kein gültiger Block in Zwischenablage
            }
          }).catch(() => {
            // Clipboard API nicht verfügbar
          });
        }
        return;
      }

      // Move: Alt+ArrowUp/Down (nur wenn nicht in Input)
      const activeElement = document.activeElement;
      const isInput = activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true");

      if (!isInput && e.altKey && selectedBlockId) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          moveBlockById(selectedBlockId, "up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          moveBlockById(selectedBlockId, "down");
        }
      }
    };

    // Capture phase verwenden, um sicherzustellen, dass wir das Event zuerst bekommen
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedBlockId, moveBlockById, canUndo, canRedo, undo, redo, content, pasteBlock]);

  // Validation: Prüfe fehlende Alt-Texte
  const validateContentForWarnings = (content: PageContentV1): string[] => {
    const warnings: string[] = [];
    content.blocks.forEach((block, index) => {
      if (block.type === "image") {
        const media = block.data.media || (block.data.src ? { url: block.data.src, alt: block.data.alt || "" } : null);
        const imageUrl = media?.url || block.data.src;
        const imageAlt = media?.alt || block.data.alt || "";
        if (imageUrl && !imageAlt) {
          warnings.push(`Bild ${index + 1} hat keinen Alt-Text`);
        }
      }
    });
    return warnings;
  };

  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<{ errors: any[]; warnings: any[] } | null>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  useEffect(() => {
    // Leitet Validierungswarnungen/-fehler aus dem aktuellen Content ab.
    // validationResult/-Errors werden zusätzlich in handleSaveDraft/handlePublish
    // gesetzt (gemischter State), daher Synchronisation per Effect statt useMemo.
    const warnings = validateContentForWarnings(content);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationWarnings(warnings);

    // Validiere Content für aktuelle Anzeige
    const result = validateContent(content, { mode: "draft" });
    setValidationResult(result);
    setValidationErrors(result.errors);
  }, [content]);

  const handleSaveDraft = async () => {
    // Validiere für Draft
    const validation = validateContent(content, { mode: "draft" });
    setValidationResult(validation);
    setShowValidationPanel(validation.errors.length > 0 || validation.warnings.length > 0);

    // Draft: Erlaube Save auch mit Warnings, blockiere nur bei fatalen Errors
    const fatalErrors = validation.errors.filter(
      (e) => e.path.includes("type") || e.message.includes("ungültig")
    );
    if (fatalErrors.length > 0) {
      setSaveError("Kritische Fehler gefunden. Bitte korrigiere die Fehler vor dem Speichern.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSave(content);
      const hash = contentHash(content);
      setLastSavedHash(hash);
      setLastSavedAt(new Date());
      // Update additionalFields hash wenn vorhanden
      if (additionalFields) {
        const fieldsHash = JSON.stringify(additionalFields);
        setLastSavedAdditionalFields(fieldsHash);
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
    // Validiere für Publish (stricter)
    const validation = validateContent(content, { mode: "publish" });
    setValidationResult(validation);
    setShowValidationPanel(validation.errors.length > 0 || validation.warnings.length > 0);

    // Publish: Blockiere bei Errors
    if (validation.errors.length > 0) {
      setSaveError(
        `${validation.errors.length} Fehler gefunden. Bitte korrigiere die Fehler vor der Veröffentlichung.`
      );
      return;
    }

    setPublishing(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Veröffentlichen");
      }

      setIsPublished(true);
      // Update additionalFields wenn Callback vorhanden
      if (onAdditionalFieldsChange) {
        onAdditionalFieldsChange({ published: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Fehler beim Veröffentlichen");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/unpublish`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Aufheben der Veröffentlichung");
      }

      setIsPublished(false);
      // Update additionalFields wenn Callback vorhanden
      if (onAdditionalFieldsChange) {
        onAdditionalFieldsChange({ published: false });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Fehler beim Aufheben der Veröffentlichung");
    } finally {
      setUnpublishing(false);
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Recovery Banner */}
      {recoveryInfo?.hadError && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm text-yellow-900">
                Seiteninhalt war beschädigt. Wir haben eine leere Seite geladen.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRecoveryModal(true);
                }}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline"
              >
                Original anzeigen
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await onSave(createEmptyContent());
                  setRecoveryInfo(undefined);
                }}
                className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded"
              >
                Zurücksetzen & speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      {showRecoveryModal && recoveryInfo?.originalSnippet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Original Content (Ausschnitt)</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {recoveryInfo.originalSnippet}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRecoveryModal(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header mit Controls */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Page Builder</h2>
          {/* Status Chip */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPublished
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {isPublished ? "Veröffentlicht" : "Entwurf"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                undo();
              }}
              disabled={!canUndo}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rückgängig (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                redo();
              }}
              disabled={!canRedo}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Wiederholen (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>


          {/* Dirty Indicator */}
          {isDirty && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span className="text-sm text-orange-800 font-medium">Ungespeichert</span>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm text-yellow-800">
                ⚠️ Hinweis: {validationWarnings.length} {validationWarnings.length === 1 ? "Bild hat" : "Bilder haben"} keinen Alt-Text
              </span>
            </div>
          )}

          {/* Save Status */}
          {saveSuccess && (
            <span className="text-sm text-green-600">
              ✓ {lastSavedAt ? `Gespeichert ${formatTimeAgo(lastSavedAt)}` : "Gespeichert"}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Speichern */}
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
              {saving ? "Wird gespeichert..." : (
                <>
                  <Copy className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>

            {/* Veröffentlichen */}
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
                {publishing ? "Wird veröffentlicht..." : (
                  <>
                    <Send className="w-4 h-4" />
                    Veröffentlichen
                  </>
                )}
              </button>
            )}

            {/* Schließen */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push("/admin/pages");
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Schließen
            </button>
          </div>
        </div>
      </div>

      {/* 3-Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Block Library */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <BlockLibrary
            onAddBlock={addBlock}
            onAddTemplate={addTemplate}
            onAddReusable={addReusable}
            onPasteBlock={pasteBlock}
          />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto bg-white p-6">
            <Canvas
              content={content}
              selectedBlockId={selectedBlockId}
              onSelectBlock={selectBlock}
              onRemoveBlock={removeBlock}
              onMoveBlock={moveBlock}
              onDuplicateBlock={duplicateBlock}
              onMoveBlockById={moveBlockById}
              onCopyBlock={(blockId) => {
                const block = content.blocks.find(b => b.id === blockId);
                if (block) {
                  const blockJson = JSON.stringify(block, null, 2);
                  navigator.clipboard.writeText(blockJson).catch(() => {
                    // Fallback für ältere Browser
                    const textArea = document.createElement("textarea");
                    textArea.value = blockJson;
                    textArea.style.position = "fixed";
                    textArea.style.opacity = "0";
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textArea);
                  });
                }
              }}
              onPasteBlock={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const block = JSON.parse(text);
                  if (block && block.type && block.data) {
                    pasteBlock(block);
                  }
                } catch (error) {
                  // Kein gültiger Block in Zwischenablage
                }
              }}
            />
        </div>

        {/* Right: Inspector */}
        <div className="w-[500px] border-l border-gray-200 bg-gray-50 overflow-y-auto flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <Inspector
              content={content}
              selectedBlockId={selectedBlockId}
              onUpdateBlock={updateBlock}
            />
          </div>
          {showValidationPanel && validationResult && (
            <ValidationPanel
              errors={validationResult.errors}
              warnings={validationResult.warnings}
              onSelectBlock={selectBlock}
              onClose={() => setShowValidationPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

