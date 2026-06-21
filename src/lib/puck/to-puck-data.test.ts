import { describe, it, expect } from "vitest";
import { contentToPuck, v1ToPuck } from "./to-puck-data";
import { resolveContentKind } from "@/lib/page-builder/schema";
import { getV2EmbedPlaceholderHtml } from "@/lib/page-builder/v2-embed-defaults";

describe("contentToPuck (Laden bestehender Inhalte in den Puck-Editor)", () => {
  it("lässt Puck-Daten unverändert (taggt nur version:3)", () => {
    const puck = {
      root: { props: {} },
      content: [{ type: "RichText", props: { id: "r", html: "<p>x</p>" } }],
    };
    const out = contentToPuck(puck);
    expect(resolveContentKind(out)).toBe("puck");
    expect(out.version).toBe(3);
    expect(out.content).toHaveLength(1);
  });

  it("konvertiert V2-HTML → Puck (Text bleibt erhalten)", () => {
    const out = contentToPuck({ version: 2, html: "<p>Bestehender Text</p>" });
    expect(resolveContentKind(out)).toBe("puck");
    const node = out.content[0] as any;
    expect(node.type).toBe("RichText");
    expect(node.props.html).toContain("Bestehender Text");
  });

  it("konvertiert V2-HTML mit Embed → RichText + Embed-Block", () => {
    const html = `<p>Intro</p>${getV2EmbedPlaceholderHtml("courses", undefined, "id")}`;
    const out = contentToPuck({ version: 2, html });
    const types = out.content.map((n: any) => n.type);
    expect(types).toContain("RichText");
    expect(types).toContain("Courses");
  });

  it("konvertiert V1-Blocks → Puck über convertV1ToV2Html (Text erhalten)", () => {
    const v1 = {
      version: 1,
      blocks: [
        { id: "1", type: "hero", data: { heading: "Hallo Welt", subheading: "Untertitel" } },
        { id: "2", type: "text", data: { text: "Ein Absatz." } },
      ],
    };
    const out = v1ToPuck(v1);
    expect(resolveContentKind(out)).toBe("puck");
    const allHtml = out.content
      .map((n: any) => (n.type === "RichText" ? n.props.html : ""))
      .join(" ");
    expect(allHtml).toContain("Hallo Welt");
    expect(allHtml).toContain("Ein Absatz.");
  });

  it("liefert für leeren/null Content leere Puck-Daten (neue Seite)", () => {
    const out = contentToPuck(null);
    expect(resolveContentKind(out)).toBe("puck");
    expect(out.content).toEqual([]);
  });
});
