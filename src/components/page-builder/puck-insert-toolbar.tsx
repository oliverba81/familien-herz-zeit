"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePuck } from "@puckeditor/core";
import {
  PUCK_TEMPLATES,
  instantiateTemplate,
  type PuckNode,
} from "@/lib/puck/templates";
import { createBlockId } from "@/lib/page-builder/ids";

const triggerCls =
  "cursor-pointer px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium";

/**
 * Dropdown, dessen Panel per Portal an `document.body` gerendert wird (position: fixed,
 * unter dem Auslöser verankert). Das ist nötig, weil Pucks Kopfzeile in einem Container
 * mit `overflow: hidden`/eigener Stapelreihenfolge liegt — ein normal positioniertes
 * Panel würde dort unsichtbar abgeschnitten bzw. vom Canvas verdeckt.
 */
function Dropdown({
  label,
  width = 288,
  onOpen,
  children,
}: {
  label: string;
  width?: number;
  onOpen?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
        setPos({ top: r.bottom + 4, left });
        onOpen?.();
      }
      return next;
    });
  }, [width, onOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} className={triggerCls}>
        {label}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width, zIndex: 9999 }}
            className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
          >
            {children(close)}
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Einfüge-Toolbar im Puck-Header (Vorlagen, Inline-KI, Reusable).
 * Nutzt `usePuck().dispatch(setData)` → hängt neue Knoten an den Seiteninhalt an.
 * Alle eingefügten Knoten bekommen frische IDs (keine State-Kollision).
 */
export function PuckInsertToolbar() {
  const { dispatch, selectedItem } = usePuck();

  const insertNodes = useCallback(
    (nodes: PuckNode[]) => {
      if (!nodes.length) return;
      dispatch({
        type: "setData",
        data: (prev) => ({
          ...prev,
          content: [...(prev.content ?? []), ...(nodes as never[])],
        }),
      });
    },
    [dispatch]
  );

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Aktuell ausgewählten Block als globalen (wiederverwendbaren) Block speichern.
  const saveSelection = useCallback(async () => {
    if (!selectedItem) {
      setSaveStatus("Bitte zuerst einen Block im Canvas auswählen.");
      window.setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    const name = window.prompt("Name für den globalen Block:");
    if (!name) return;
    try {
      const contentJson = { version: 3, root: { props: {} }, content: [selectedItem] };
      const res = await fetch("/api/reusable-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contentJson }),
      });
      setSaveStatus(res.ok ? "✓ Als globaler Block gespeichert" : "Fehler beim Speichern");
    } catch {
      setSaveStatus("Fehler beim Speichern");
    }
    window.setTimeout(() => setSaveStatus(null), 3000);
  }, [selectedItem]);

  // --- Inline-KI ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateAi = useCallback(
    async (onSuccess?: () => void) => {
      if (!aiPrompt.trim()) return;
      setAiLoading(true);
      setAiError(null);
      try {
        const res = await fetch("/api/puck/generate-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fehler bei der KI-Generierung");
        insertNodes(data.nodes as PuckNode[]);
        setAiPrompt("");
        onSuccess?.();
      } catch (e) {
        setAiError((e as Error).message);
      } finally {
        setAiLoading(false);
      }
    },
    [aiPrompt, insertNodes]
  );

  // --- Reusable ---
  const [reusables, setReusables] = useState<{ id: string; name: string }[]>([]);
  const loadReusables = useCallback(async () => {
    try {
      const res = await fetch("/api/reusable-blocks");
      if (res.ok) setReusables(await res.json());
    } catch {
      // ignorieren
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Vorlagen */}
      <Dropdown label="➕ Vorlage" width={320}>
        {(close) => (
          <ul>
            {PUCK_TEMPLATES.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  onClick={() => {
                    insertNodes(instantiateTemplate(tpl.nodes));
                    close();
                  }}
                  className="w-full flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-gray-100"
                >
                  {tpl.thumbnail && (
                     
                    <img
                      src={tpl.thumbnail}
                      alt=""
                      className="shrink-0 w-16 h-12 rounded border border-gray-200 bg-white object-contain"
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">{tpl.label}</span>
                    {tpl.description && (
                      <span className="block text-xs text-gray-500 truncate">
                        {tpl.description}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      {/* Inline-KI */}
      <Dropdown label="✨ KI" width={300}>
        {(close) => (
          <div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder="Was soll generiert werden? z. B. 'Abschnitt über unsere Babykurse mit Überschrift und drei Vorteilen'"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
            {aiError && <p className="text-xs text-red-600 mt-1">{aiError}</p>}
            <button
              type="button"
              onClick={() => void generateAi(close)}
              disabled={aiLoading || !aiPrompt.trim()}
              className="mt-2 w-full px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white disabled:opacity-50"
            >
              {aiLoading ? "Generiert …" : "Generieren & einfügen"}
            </button>
          </div>
        )}
      </Dropdown>

      {/* Reusable */}
      <Dropdown label="🔄 Block" onOpen={() => void loadReusables()}>
        {(close) => (
          <ul>
            {reusables.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-gray-500">Keine Blöcke vorhanden.</li>
            ) : (
              reusables.map((rb) => (
                <li key={rb.id}>
                  <button
                    type="button"
                    onClick={() => {
                      insertNodes([
                        { type: "Reusable", props: { id: createBlockId(), reusableId: rb.id } },
                      ]);
                      close();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-sm"
                  >
                    {rb.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </Dropdown>

      {/* Auswahl als globalen Block speichern */}
      <button type="button" onClick={() => void saveSelection()} className={triggerCls}>
        💾 Auswahl speichern
      </button>
      {saveStatus && <span className="text-xs text-gray-600">{saveStatus}</span>}
    </div>
  );
}
