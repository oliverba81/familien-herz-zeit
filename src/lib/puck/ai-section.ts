import { createBlockId } from "@/lib/page-builder/ids";

/**
 * Inline-KI-Sektionen (Feature 7): KI erzeugt aus einem Prompt Puck-Knoten.
 *
 * SICHERHEIT: KI-Ausgabe ist nie vertrauenswürdig → strikt gegen die erlaubten
 * Komponenten-Typen validieren, unbekannte/kaputte Knoten verwerfen, frische IDs
 * vergeben. Erst danach in den Editor einfügen.
 */

export const KNOWN_PUCK_TYPES = new Set<string>([
  "RichText",
  "Section",
  "Image",
  "Heading",
  "Button",
  "Spacer",
  "Divider",
  "Columns",
  "Video",
  "Embed",
  "Accordion",
  "Tabs",
  "Gallery",
  "Features",
  "Testimonials",
  "Courses",
  "CurrentAppointments",
  "HerzZeitStory",
  "ContactForm",
]);

/** Slot-Props je Komponententyp (Kinder, die rekursiv validiert werden müssen). */
const SLOT_KEYS: Record<string, string[]> = {
  Section: ["children"],
  Columns: ["col1", "col2", "col3"],
};

export interface PuckNode {
  type: string;
  props: Record<string, unknown> & { id: string };
}

const MAX_DEPTH = 4;
const MAX_NODES = 20;

function coerceNode(raw: unknown, depth: number): PuckNode | null {
  if (depth > MAX_DEPTH || raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = typeof r.type === "string" ? r.type : "";
  if (!KNOWN_PUCK_TYPES.has(type)) return null;

  const inProps =
    r.props && typeof r.props === "object" ? (r.props as Record<string, unknown>) : {};
  const props: Record<string, unknown> = { ...inProps, id: createBlockId() };

  // RichText braucht nicht-leeren html-String.
  if (type === "RichText") {
    if (typeof props.html !== "string" || props.html.trim() === "") return null;
  }

  // Slot-Kinder (Section.children, Columns.col1..col3) rekursiv validieren.
  for (const key of SLOT_KEYS[type] ?? []) {
    const children = Array.isArray(inProps[key]) ? (inProps[key] as unknown[]) : [];
    props[key] = children
      .map((c) => coerceNode(c, depth + 1))
      .filter((c): c is PuckNode => c !== null);
  }

  return { type, props: props as PuckNode["props"] };
}

/**
 * Validiert/säubert KI-Ausgabe zu sicheren Puck-Knoten. Akzeptiert ein Array oder
 * ein Objekt mit `content`/`nodes`. Unbekannte Typen werden verworfen.
 */
export function validateGeneratedNodes(raw: unknown): PuckNode[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.content)) arr = o.content;
    else if (Array.isArray(o.nodes)) arr = o.nodes;
  }
  return arr
    .map((n) => coerceNode(n, 0))
    .filter((n): n is PuckNode => n !== null)
    .slice(0, MAX_NODES);
}

export const SECTION_SYSTEM_PROMPT = `Du bist ein Assistent, der Inhaltssektionen für einen visuellen Seiten-Editor erzeugt.
Du darfst AUSSCHLIESSLICH diese Komponenten verwenden:
- "Heading" mit props.text und props.level (1-6) und props.align ("left"/"center"/"right")
- "RichText" mit props.html (HTML-String: <h2>, <h3>, <p>, <ul>/<li>, <strong>, <em>, <a>)
- "Image" mit props.src, props.alt, props.caption
- "Button" mit props.text, props.href, props.variant ("primary"/"secondary")
- "Section" mit props.children (Array weiterer Komponenten)
- "Columns" mit props.count (2 oder 3) und props.col1/col2/col3 (jeweils Array weiterer Komponenten)
- "Spacer" mit props.size ("sm"/"md"/"lg"/"xl"), "Divider" (ohne Props)
- "Embed" mit props.url (YouTube/Vimeo) und props.title
- "Accordion" mit props.items (Array aus {question, answer})
- "Tabs" mit props.items (Array aus {label, content})
- "Gallery" mit props.columns (2-4) und props.items (Array aus {src, alt})
- "Features" mit props.title und props.items (Array aus {title, text})
- "Testimonials" mit props.title und props.items (Array aus {name, text})
- "Courses", "CurrentAppointments", "HerzZeitStory", "ContactForm" (ohne weitere Pflicht-Props)
Antworte NUR mit JSON dieser Form, ohne Markdown/Erklärung:
{"nodes": [ { "type": "Heading", "props": { "text": "…", "level": 2 } }, { "type": "RichText", "props": { "html": "<p>…</p>" } } ] }
Schreibe auf Deutsch, prägnant und passend zum Wunsch des Nutzers.`;

export function buildSectionUserPrompt(userPrompt: string): string {
  return `Erzeuge eine Inhaltssektion für: ${userPrompt.trim()}`;
}
