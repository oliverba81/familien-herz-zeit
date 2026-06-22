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
  "Courses",
  "CurrentAppointments",
  "HerzZeitStory",
  "ContactForm",
]);

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

  // Section: children rekursiv validieren (Slot).
  if (type === "Section") {
    const children = Array.isArray(inProps.children) ? inProps.children : [];
    props.children = children
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
- "RichText" mit props.html (HTML-String: <h2>, <h3>, <p>, <ul>/<li>, <strong>, <em>, <a>)
- "Section" mit props.children (Array weiterer Komponenten)
- "Image" mit props.src, props.alt, props.caption
- "Courses", "CurrentAppointments", "HerzZeitStory", "ContactForm" (ohne weitere Pflicht-Props)
Antworte NUR mit JSON dieser Form, ohne Markdown/Erklärung:
{"nodes": [ { "type": "RichText", "props": { "html": "<h2>…</h2><p>…</p>" } } ] }
Schreibe auf Deutsch, prägnant und passend zum Wunsch des Nutzers.`;

export function buildSectionUserPrompt(userPrompt: string): string {
  return `Erzeuge eine Inhaltssektion für: ${userPrompt.trim()}`;
}
