import { describe, it, expect } from "vitest";
import { validateGeneratedNodes, type PuckNode } from "./ai-section";

describe("validateGeneratedNodes (KI-Ausgabe absichern)", () => {
  it("akzeptiert valide RichText-Knoten und vergibt frische IDs", () => {
    const out = validateGeneratedNodes({
      nodes: [{ type: "RichText", props: { html: "<p>Hallo</p>" } }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("RichText");
    expect(typeof out[0].props.id).toBe("string");
    expect(out[0].props.id.length).toBeGreaterThan(0);
  });

  it("verwirft unbekannte Komponenten-Typen", () => {
    const out = validateGeneratedNodes([
      { type: "EvilScript", props: { src: "x" } },
      { type: "RichText", props: { html: "<p>ok</p>" } },
    ]);
    expect(out.map((n) => n.type)).toEqual(["RichText"]);
  });

  it("verwirft RichText ohne html", () => {
    expect(validateGeneratedNodes([{ type: "RichText", props: {} }])).toHaveLength(0);
    expect(validateGeneratedNodes([{ type: "RichText", props: { html: "  " } }])).toHaveLength(0);
  });

  it("validiert Section-Slot-Kinder rekursiv und verwirft kaputte", () => {
    const out = validateGeneratedNodes([
      {
        type: "Section",
        props: {
          children: [
            { type: "RichText", props: { html: "<p>gut</p>" } },
            { type: "Boese", props: {} },
          ],
        },
      },
    ]);
    expect(out).toHaveLength(1);
    const children = (out[0].props.children as PuckNode[]);
    expect(children).toHaveLength(1);
    expect(children[0].type).toBe("RichText");
  });

  it("akzeptiert Embeds ohne Pflicht-Props", () => {
    const out = validateGeneratedNodes([{ type: "ContactForm", props: {} }]);
    expect(out[0].type).toBe("ContactForm");
    expect(typeof out[0].props.id).toBe("string");
  });

  it("liefert leeres Array für Müll-Eingaben", () => {
    expect(validateGeneratedNodes(null)).toEqual([]);
    expect(validateGeneratedNodes("kaputt")).toEqual([]);
    expect(validateGeneratedNodes({ foo: 1 })).toEqual([]);
  });

  it("akzeptiert die neuen Blocktypen (Heading, Accordion, Gallery)", () => {
    const out = validateGeneratedNodes([
      { type: "Heading", props: { text: "Titel", level: 2 } },
      { type: "Accordion", props: { items: [{ question: "Q", answer: "A" }] } },
      { type: "Gallery", props: { columns: 3, items: [] } },
    ]);
    expect(out.map((n) => n.type)).toEqual(["Heading", "Accordion", "Gallery"]);
  });

  it("validiert Columns-Slots (col1/col2) rekursiv", () => {
    const out = validateGeneratedNodes([
      {
        type: "Columns",
        props: {
          count: 2,
          col1: [{ type: "RichText", props: { html: "<p>links</p>" } }],
          col2: [{ type: "Boese", props: {} }],
        },
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].props.col1 as PuckNode[]).toHaveLength(1);
    expect(out[0].props.col2 as PuckNode[]).toHaveLength(0);
  });
});
