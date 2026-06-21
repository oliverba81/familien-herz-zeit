"use client";

import { useEffect, useState } from "react";
import type { Editor as WysiwygCore } from "@/vendor/wysiwyg-editor/core/Editor";
import {
  V2_EMBED_BLOCK_TYPES,
  V2_BLOCK_ICONS,
  V2_BLOCK_LABELS,
  getV2EmbedDefaultData,
  parseEmbedDataFromAttribute,
  type V2EmbedBlockType,
} from "@/lib/page-builder/v2-embed-defaults";

const LIVE_ATTR = "data-fhz-live";

export interface LiveMount {
  blockId: string;
  blockType: V2EmbedBlockType;
  data: Record<string, unknown>;
  container: HTMLElement;
}

/**
 * Normalisiert das Platzhalter-Label in ein `<span class="fhz-embed-label">`
 * (vorwärtskompatibel; lässt sich per CSS sauber ausblenden, sobald die
 * Live-Vorschau gemountet ist). Idempotent.
 */
function ensureLabelSpan(ph: HTMLElement, blockType: V2EmbedBlockType): boolean {
  if (ph.querySelector(":scope > .fhz-embed-label")) return false;
  const textNodes: ChildNode[] = [];
  ph.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) textNodes.push(n);
  });
  const icon = V2_BLOCK_ICONS[blockType] ?? "";
  const label = V2_BLOCK_LABELS[blockType] ?? "";
  textNodes.forEach((n) => n.remove());
  const span = document.createElement("span");
  span.className = "fhz-embed-label";
  span.textContent = `${icon} ${label}`.trim();
  ph.insertBefore(span, ph.firstChild);
  return true;
}

/**
 * Hält die Liste der Live-Mounts (ein Container `[data-fhz-live]` je Embed-Platzhalter)
 * synchron mit dem Editor-DOM – über setHTML / Paste / Undo / Redo / Drag hinweg.
 * Eigene DOM-Mutationen laufen mit pausierter History und getrenntem Observer,
 * damit weder Undo-Snapshots noch Endlosschleifen entstehen.
 */
export function useEmbedLiveMounts(editor: WysiwygCore | null): LiveMount[] {
  const [mounts, setMounts] = useState<LiveMount[]>([]);

  useEffect(() => {
    if (!editor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounts([]);
      return;
    }
    const editorEl = editor.editorEl;
    let raf = 0;
    let disposed = false;

    const observerInit: MutationObserverInit = {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-fhz-block-data", "data-fhz-block", "data-fhz-block-id"],
    };

    const reconcile = () => {
      raf = 0;
      if (disposed) return;
      // Eigene Mutationen nicht beobachten und nicht in die History schreiben.
      observer.disconnect();
      editor.pauseHistory();
      try {
        const placeholders = Array.from(
          editorEl.querySelectorAll<HTMLElement>("[data-fhz-block]")
        );
        const next: LiveMount[] = [];
        for (const ph of placeholders) {
          const blockType = ph.getAttribute("data-fhz-block") as V2EmbedBlockType | null;
          const blockId = ph.getAttribute("data-fhz-block-id");
          if (
            !blockType ||
            !blockId ||
            !V2_EMBED_BLOCK_TYPES.includes(blockType)
          ) {
            continue;
          }
          ensureLabelSpan(ph, blockType);
          const data =
            parseEmbedDataFromAttribute(ph.getAttribute("data-fhz-block-data")) ??
            getV2EmbedDefaultData(blockType);
          let container = ph.querySelector<HTMLElement>(
            `:scope > [${LIVE_ATTR}]`
          );
          if (!container) {
            container = document.createElement("div");
            container.setAttribute(LIVE_ATTR, "");
            ph.appendChild(container);
          }
          next.push({ blockId, blockType, data, container });
        }
        setMounts(next);
      } finally {
        editor.resumeHistory();
        if (!disposed) observer.observe(editorEl, observerInit);
      }
    };

    const schedule = () => {
      if (raf || disposed) return;
      raf = requestAnimationFrame(reconcile);
    };

    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        const target = rec.target as Node;
        const el =
          target.nodeType === Node.ELEMENT_NODE
            ? (target as HTMLElement)
            : target.parentElement;
        // Mutationen, die ausschließlich innerhalb eines Live-Containers passieren
        // (unsere eigenen React-Renders), ignorieren.
        if (el && el.closest(`[${LIVE_ATTR}]`)) continue;
        schedule();
        return;
      }
    });

    observer.observe(editorEl, observerInit);
    schedule();

    return () => {
      disposed = true;
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [editor]);

  return mounts;
}
