"use client";

import { useCallback, useState } from "react";
import { usePuck } from "@puckeditor/core";
import {
  PUCK_TEMPLATES,
  instantiateTemplate,
  type PuckNode,
} from "@/lib/puck/templates";
import { createBlockId } from "@/lib/page-builder/ids";

/**
 * Einfüge-Toolbar im Puck-Header (Vorlagen, Inline-KI, Reusable).
 * Nutzt `usePuck().dispatch(setData)` → hängt neue Knoten an den Seiteninhalt an.
 * Alle eingefügten Knoten bekommen frische IDs (keine State-Kollision).
 */
export function PuckInsertToolbar() {
  const { dispatch } = usePuck();

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

  // --- Inline-KI ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateAi = useCallback(async () => {
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
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, insertNodes]);

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

  const summaryCls =
    "cursor-pointer list-none px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium";
  const panelCls =
    "absolute z-20 mt-1 w-72 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg";

  return (
    <div className="flex items-center gap-2">
      {/* Vorlagen */}
      <details className="relative">
        <summary className={summaryCls}>➕ Vorlage</summary>
        <ul className={`${panelCls} w-80`}>
          {PUCK_TEMPLATES.map((tpl) => (
            <li key={tpl.id}>
              <button
                type="button"
                onClick={() => insertNodes(instantiateTemplate(tpl.nodes))}
                className="w-full flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-gray-100"
              >
                {tpl.preview && (
                  <span
                    className="shrink-0 w-16 h-12 overflow-hidden rounded border border-gray-200 bg-white p-1 text-[8px] leading-tight"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: tpl.preview }}
                  />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{tpl.label}</span>
                  {tpl.description && (
                    <span className="block text-xs text-gray-500 truncate">{tpl.description}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {/* Inline-KI */}
      <details className="relative">
        <summary className={summaryCls}>✨ KI</summary>
        <div className={panelCls}>
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
            onClick={generateAi}
            disabled={aiLoading || !aiPrompt.trim()}
            className="mt-2 w-full px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white disabled:opacity-50"
          >
            {aiLoading ? "Generiert …" : "Generieren & einfügen"}
          </button>
        </div>
      </details>

      {/* Reusable */}
      <details
        className="relative"
        onToggle={(e) => {
          if ((e.target as HTMLDetailsElement).open) void loadReusables();
        }}
      >
        <summary className={summaryCls}>🔄 Block</summary>
        <ul className={panelCls}>
          {reusables.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-gray-500">Keine Blöcke vorhanden.</li>
          ) : (
            reusables.map((rb) => (
              <li key={rb.id}>
                <button
                  type="button"
                  onClick={() =>
                    insertNodes([
                      { type: "Reusable", props: { id: createBlockId(), reusableId: rb.id } },
                    ])
                  }
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-sm"
                >
                  {rb.name}
                </button>
              </li>
            ))
          )}
        </ul>
      </details>
    </div>
  );
}
