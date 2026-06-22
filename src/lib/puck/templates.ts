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

export interface PuckTemplate {
  id: string;
  label: string;
  description?: string;
  /** Kurze HTML-Vorschau (Mini-Thumbnail im Vorlagen-Menü). */
  preview?: string;
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
    preview: "<div style='font-weight:700'>Überschrift</div><div style='color:#9ca3af'>Text …</div>",
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
    preview:
      "<div style='border:1px solid #e5e7eb;border-radius:4px;padding:4px'>Sektion</div>",
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
    preview:
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:4px'><div style='background:#f3f4f6;height:18px'></div><div style='background:#f3f4f6;height:18px'></div></div>",
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
    preview:
      "<div style='text-align:center'><div style='font-weight:700'>Jetzt mitmachen</div><span style='display:inline-block;background:#f43f5e;color:#fff;border-radius:4px;padding:1px 6px;font-size:10px'>Button</span></div>",
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
    preview:
      "<div><div style='font-weight:700'>Kontakt</div><div style='background:#f3f4f6;height:20px;border-radius:4px'></div></div>",
    nodes: [
      {
        type: "RichText",
        props: { id: "tpl", html: "<h2>Kontakt</h2><p>Schreib uns!</p>" },
      },
      { type: "ContactForm", props: { id: "tpl" } },
    ],
  },
];
