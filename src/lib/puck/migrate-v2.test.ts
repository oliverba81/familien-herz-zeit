import { describe, it, expect } from "vitest";
import { v2HtmlToPuck, V2_EMBED_TO_PUCK } from "./migrate-v2";
import { getV2EmbedPlaceholderHtml } from "@/lib/page-builder/v2-embed-defaults";
import { resolveContentKind } from "@/lib/page-builder/schema";

describe("v2HtmlToPuck", () => {
  it("macht aus reinem HTML einen einzelnen RichText-Knoten", () => {
    const puck = v2HtmlToPuck("<p>Hallo <strong>Welt</strong></p>");
    expect(resolveContentKind(puck)).toBe("puck");
    expect(puck.content).toHaveLength(1);
    const node = puck.content[0] as any;
    expect(node.type).toBe("RichText");
    expect(node.props.html).toBe("<p>Hallo <strong>Welt</strong></p>");
    expect(typeof node.props.id).toBe("string");
  });

  it("gibt für leeren/whitespace HTML leeren content zurück", () => {
    expect(v2HtmlToPuck("").content).toEqual([]);
    expect(v2HtmlToPuck("   \n  ").content).toEqual([]);
    expect(v2HtmlToPuck(undefined as unknown as string).content).toEqual([]);
  });

  it("wandelt einen Embed-Platzhalter in die passende Puck-Komponente (mit Daten)", () => {
    const html = getV2EmbedPlaceholderHtml("courses", { maxCourses: 5 }, "id-1");
    const puck = v2HtmlToPuck(html);
    expect(puck.content).toHaveLength(1);
    const node = puck.content[0] as any;
    expect(node.type).toBe(V2_EMBED_TO_PUCK["courses"]); // "Courses"
    expect(node.props.maxCourses).toBe(5);
    expect(node.props.id).toMatch(/^courses-/);
  });

  it("behandelt gemischtes HTML + Embed + HTML als Knotenfolge", () => {
    const embed = getV2EmbedPlaceholderHtml("herzzeit-story", undefined, "id-2");
    const html = `<p>Intro</p>${embed}<p>Outro</p>`;
    const puck = v2HtmlToPuck(html);
    expect(puck.content.map((n: any) => n.type)).toEqual([
      "RichText",
      "HerzZeitStory",
      "RichText",
    ]);
    // IDs eindeutig
    const ids = puck.content.map((n: any) => n.props.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fällt bei kaputten Embed-Daten auf Defaults zurück (kein Crash)", () => {
    const html =
      '<div data-fhz-block="courses" data-fhz-block-id="x" data-fhz-block-data="%%%kaputt%%%" class="fhz-embed">x</div>';
    const puck = v2HtmlToPuck(html);
    expect(puck.content).toHaveLength(1);
    const node = puck.content[0] as any;
    expect(node.type).toBe("Courses");
    // Default-Daten der Registry sind nicht leer
    expect(Object.keys(node.props).length).toBeGreaterThan(1);
  });

  it("ist deterministisch (gleiche Eingabe → gleiche IDs)", () => {
    const html = `<p>A</p>${getV2EmbedPlaceholderHtml("contactForm", undefined, "id")}<p>B</p>`;
    expect(v2HtmlToPuck(html)).toEqual(v2HtmlToPuck(html));
  });
});
