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
    nodes: [
      {
        type: "RichText",
        props: {
          id: "tpl",
          html: "<h2>Überschrift</h2><p>Dein Text …</p>",
        },
      },
    ],
  },
  {
    id: "section-text",
    label: "Sektion mit Text",
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
    id: "contact",
    label: "Kontaktbereich",
    nodes: [
      {
        type: "RichText",
        props: { id: "tpl", html: "<h2>Kontakt</h2><p>Schreib uns!</p>" },
      },
      { type: "ContactForm", props: { id: "tpl" } },
    ],
  },
];
