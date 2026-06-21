import { parseHtmlSegments } from "@/lib/page-builder/html-segments";
import type { PageContentPuck } from "@/lib/page-builder/schema";

/**
 * Mapping V2-Embed-Blocktyp → Puck-Komponentenname.
 * Wird auch von Puck-Config und `renderPuckTree` genutzt.
 */
export const V2_EMBED_TO_PUCK: Record<string, string> = {
  courses: "Courses",
  "current-appointments": "CurrentAppointments",
  "herzzeit-story": "HerzZeitStory",
  contactForm: "ContactForm",
};

export interface PuckComponentData {
  type: string;
  props: Record<string, unknown> & { id: string };
}

/**
 * Lazy-Migration V2 (`{ version: 2, html }`) → Puck-Daten (`version: 3`).
 *
 * HTML-Abschnitte werden zu `RichText`-Knoten, `data-fhz-block`-Platzhalter zu den
 * entsprechenden Embed-Komponenten (Daten aus base64 `data-fhz-block-data`).
 * Verlustfrei in dem Sinn, dass jeder sichtbare Abschnitt einen Knoten erhält und
 * Embed-Konfigurationen erhalten bleiben. IDs sind deterministisch (index-basiert),
 * damit Migration reproduzierbar/testbar ist.
 */
export function v2HtmlToPuck(html: string): PageContentPuck {
  const content: PuckComponentData[] = [];

  if (typeof html !== "string" || html.trim().length === 0) {
    return { version: 3, root: { props: {} }, content: [] };
  }

  const segments = parseHtmlSegments(html);
  let index = 0;

  for (const seg of segments) {
    if (seg.type === "html") {
      const htmlStr = seg.html.trim();
      if (htmlStr.length === 0) continue;
      content.push({
        type: "RichText",
        props: { id: `richtext-${index++}`, html: htmlStr },
      });
    } else {
      const compType = V2_EMBED_TO_PUCK[seg.blockType];
      if (!compType) continue; // unbekannter Block → überspringen (kein Crash)
      content.push({
        type: compType,
        props: { id: `${seg.blockType}-${index++}`, ...seg.blockData },
      });
    }
  }

  return { version: 3, root: { props: {} }, content };
}
