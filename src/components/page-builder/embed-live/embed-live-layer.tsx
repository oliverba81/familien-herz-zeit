"use client";

import { createPortal } from "react-dom";
import type { Editor as WysiwygCore } from "@/vendor/wysiwyg-editor/core/Editor";
import { useEmbedLiveMounts } from "./use-embed-live-mounts";
import { EmbedLivePreview } from "./embed-live-preview";
import "./embed-live.css";

/**
 * Rendert die echten Embed-Komponenten per Portal in die Platzhalter des
 * WYSIWYG-Builders. Die Portal-Container (`[data-fhz-live]`) sind laufzeit-only
 * und werden von `Editor.getHTML()` vor dem Speichern entfernt.
 */
export default function EmbedLiveLayer({ editor }: { editor: WysiwygCore | null }) {
  const mounts = useEmbedLiveMounts(editor);
  return (
    <>
      {mounts.map((m) =>
        createPortal(
          <div
            className="fhz-embed-live-root"
            // Klicks auf Links/Buttons in der Vorschau nicht navigieren lassen
            // (Editor-Vorschau ist nicht interaktiv-navigierend). Propagation
            // bleibt erhalten, damit der Block-Klick die Sidebar öffnet.
            onClickCapture={(e) => {
              const anchor = (e.target as HTMLElement)?.closest?.("a[href]");
              if (anchor) e.preventDefault();
            }}
          >
            <EmbedLivePreview blockType={m.blockType} data={m.data} />
          </div>,
          m.container,
          m.blockId
        )
      )}
    </>
  );
}
