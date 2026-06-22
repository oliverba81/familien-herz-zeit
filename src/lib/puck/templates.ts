import { createBlockId } from "@/lib/page-builder/ids";

/**
 * Vorlagen-Bibliothek (Feature 4): vordefinierte Puck-Teilbäume zum Einfügen.
 *
 * KRITISCH: Beim Einfügen müssen alle `props.id` (inkl. Slot-Kinder) NEU vergeben
 * werden — sonst kollidieren IDs und Pucks State korrumpiert.
 */

export interface PuckNode {
  type: string;
  props: Record<string, unknown> & { id?: string };
}

/** Baut ein inline SVG-Thumbnail (Daten-URI) für das Vorlagen-Menü. */
function thumb(inner: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 44'><rect width='60' height='44' fill='#ffffff'/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface PuckTemplate {
  id: string;
  label: string;
  description?: string;
  /** Vorschau-Thumbnail (Daten-URI) im Vorlagen-Menü. */
  thumbnail?: string;
  nodes: PuckNode[];
}

function isNodeArray(value: unknown): value is PuckNode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) => v != null && typeof v === "object" && "type" in v && "props" in v
    )
  );
}

/** Klont einen Knoten und vergibt alle IDs (rekursiv über Slot-Props) neu. */
function rekey(node: PuckNode): PuckNode {
  const props: Record<string, unknown> = { ...node.props, id: createBlockId() };
  for (const [key, value] of Object.entries(props)) {
    if (isNodeArray(value)) {
      props[key] = value.map(rekey);
    }
  }
  return { type: node.type, props: props as PuckNode["props"] };
}

/** Erzeugt eine einfügbare Kopie einer Vorlage mit frischen, eindeutigen IDs. */
export function instantiateTemplate(nodes: PuckNode[]): PuckNode[] {
  return nodes.map(rekey);
}

/** Vordefinierte Vorlagen (kompakt; iterativ erweiterbar). */
export const PUCK_TEMPLATES: PuckTemplate[] = [
  {
    id: "text",
    label: "Textabschnitt",
    description: "Überschrift + Absatz",
    thumbnail: thumb(
      "<rect x='6' y='8' width='34' height='6' rx='2' fill='#374151'/><rect x='6' y='20' width='48' height='4' rx='2' fill='#d1d5db'/><rect x='6' y='28' width='44' height='4' rx='2' fill='#d1d5db'/><rect x='6' y='36' width='40' height='4' rx='2' fill='#d1d5db'/>"
    ),
    nodes: [
      {
        type: "RichText",
        props: { id: "tpl", html: "<h2>Überschrift</h2><p>Dein Text …</p>" },
      },
    ],
  },
  {
    id: "section-text",
    label: "Sektion mit Text",
    description: "Gruppierter Bereich mit Text",
    thumbnail: thumb(
      "<rect x='4' y='6' width='52' height='32' rx='3' fill='#f9fafb' stroke='#e5e7eb'/><rect x='10' y='14' width='30' height='5' rx='2' fill='#374151'/><rect x='10' y='24' width='40' height='4' rx='2' fill='#d1d5db'/>"
    ),
    nodes: [
      {
        type: "Section",
        props: {
          id: "tpl",
          className: "",
          children: [
            { type: "RichText", props: { id: "tpl", html: "<p>Inhalt der Sektion …</p>" } },
          ],
        },
      },
    ],
  },
  {
    id: "two-columns",
    label: "Zwei Spalten",
    description: "Text links und rechts nebeneinander",
    thumbnail: thumb(
      "<rect x='6' y='10' width='22' height='24' rx='3' fill='#f3f4f6'/><rect x='32' y='10' width='22' height='24' rx='3' fill='#f3f4f6'/>"
    ),
    nodes: [
      {
        type: "Columns",
        props: {
          id: "tpl",
          count: 2,
          col1: [{ type: "RichText", props: { id: "tpl", html: "<p>Linke Spalte …</p>" } }],
          col2: [{ type: "RichText", props: { id: "tpl", html: "<p>Rechte Spalte …</p>" } }],
        },
      },
    ],
  },
  {
    id: "cta",
    label: "Call-to-Action",
    description: "Überschrift, Text und Button",
    thumbnail: thumb(
      "<rect x='14' y='8' width='32' height='6' rx='2' fill='#374151'/><rect x='10' y='20' width='40' height='4' rx='2' fill='#d1d5db'/><rect x='20' y='30' width='20' height='8' rx='4' fill='#f43f5e'/>"
    ),
    nodes: [
      {
        type: "RichText",
        props: { id: "tpl", html: "<h2 style='text-align:center'>Jetzt mitmachen</h2><p style='text-align:center'>Kurzer motivierender Text.</p>" },
      },
      {
        type: "Button",
        props: { id: "tpl", text: "Jetzt anmelden", href: "/kontakt", variant: "primary", align: "center" },
      },
    ],
  },
  {
    id: "contact",
    label: "Kontaktbereich",
    description: "Text + Kontaktformular",
    thumbnail: thumb(
      "<rect x='6' y='8' width='24' height='6' rx='2' fill='#374151'/><rect x='6' y='20' width='48' height='18' rx='3' fill='#f3f4f6' stroke='#e5e7eb'/>"
    ),
    nodes: [
      {
        type: "RichText",
        props: { id: "tpl", html: "<h2>Kontakt</h2><p>Schreib uns!</p>" },
      },
      { type: "ContactForm", props: { id: "tpl" } },
    ],
  },
];
