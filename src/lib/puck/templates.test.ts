import { describe, it, expect } from "vitest";
import { instantiateTemplate, PUCK_TEMPLATES, type PuckNode } from "./templates";

function collectIds(nodes: PuckNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    if (typeof node.props.id === "string") acc.push(node.props.id);
    for (const value of Object.values(node.props)) {
      if (Array.isArray(value) && value.every((v) => v && typeof v === "object" && "type" in v)) {
        collectIds(value as PuckNode[], acc);
      }
    }
  }
  return acc;
}

describe("instantiateTemplate", () => {
  it("vergibt für alle Knoten (inkl. Slot-Kinder) neue, eindeutige IDs", () => {
    const tpl = PUCK_TEMPLATES.find((t) => t.id === "section-text")!;
    const out = instantiateTemplate(tpl.nodes);
    const ids = collectIds(out);
    // alle IDs eindeutig
    expect(new Set(ids).size).toBe(ids.length);
    // keine ID ist noch der Platzhalter "tpl"
    expect(ids.every((id) => id !== "tpl")).toBe(true);
  });

  it("zwei Instanzen kollidieren nicht (keine gemeinsamen IDs)", () => {
    const tpl = PUCK_TEMPLATES.find((t) => t.id === "contact")!;
    const a = collectIds(instantiateTemplate(tpl.nodes));
    const b = collectIds(instantiateTemplate(tpl.nodes));
    expect(a.some((id) => b.includes(id))).toBe(false);
  });

  it("verändert die Original-Vorlage nicht (Deep-Clone)", () => {
    const tpl = PUCK_TEMPLATES.find((t) => t.id === "text")!;
    const before = JSON.stringify(tpl.nodes);
    instantiateTemplate(tpl.nodes);
    expect(JSON.stringify(tpl.nodes)).toBe(before);
  });

  it("erhält Struktur & Inhalt (nur IDs ändern sich)", () => {
    const tpl = PUCK_TEMPLATES.find((t) => t.id === "text")!;
    const out = instantiateTemplate(tpl.nodes);
    expect(out[0].type).toBe("RichText");
    expect(out[0].props.html).toBe(tpl.nodes[0].props.html);
  });
});
