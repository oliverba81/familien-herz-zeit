"use client";

import { useState } from "react";
import PuckPageEditor from "@/components/page-builder/puck-page-editor";
import type { PageContentPuck } from "@/lib/page-builder/schema";

/**
 * Test-Harness für den Puck-Visual-Builder (Admin-only, zur visuellen Verifikation).
 *
 * Zweck: iframe-1:1-Treue, Viewport-Responsive (Mobil/Tablet/Desktop/Voll), customCss-
 * Injektion und RichText-Panel-Fokus im Browser prüfen — noch ohne page-form/DB-Anbindung.
 */

const INITIAL: PageContentPuck = {
  version: 3,
  root: { props: {} },
  content: [
    {
      type: "RichText",
      props: {
        id: "r1",
        html: "<h2>Willkommen im Puck-Builder</h2><p>Klicke einen Block an und bearbeite den Text links im Panel. Ziehe neue Blöcke aus der Komponentenliste.</p>",
      },
    },
    {
      type: "Section",
      props: {
        id: "s1",
        className: "",
        children: [
          {
            type: "RichText",
            props: { id: "r2", html: "<p>Dieser Text liegt in einer verschachtelten Sektion (Slot).</p>" },
          },
        ],
      },
    },
    { type: "Courses", props: { id: "c1" } },
    { type: "ContactForm", props: { id: "k1" } },
  ],
};

const SAMPLE_CSS = `/* customCss-Test: wirkt 1:1 wie live */
.tinymce-preview-content h2 { color: #be123c; }`;

export default function PuckTestPage() {
  const [data] = useState<PageContentPuck>(INITIAL);

  return (
    <div style={{ height: "calc(100vh - 4rem)" }}>
      <PuckPageEditor
        data={data}
        customCss={SAMPLE_CSS}
        onPublish={(d) => {
           
          console.log("[puck-test] onPublish", d);
        }}
        onChange={(d) => {
           
          console.log("[puck-test] onChange", d?.content?.length, "Blöcke");
        }}
      />
    </div>
  );
}
