import { describe, it, expect } from "vitest";
import { analyzePuckA11y } from "./a11y";
import type { PageContentPuck } from "@/lib/page-builder/schema";

function puck(content: unknown[]): PageContentPuck {
  return { version: 3, root: { props: {} }, content } as PageContentPuck;
}

describe("analyzePuckA11y", () => {
  it("meldet <img> ohne Alt im RichText", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "RichText", props: { id: "r", html: '<p><img src="x.jpg"></p>' } }])
    );
    expect(issues.some((i) => /Alt-Text/.test(i.message))).toBe(true);
  });

  it("akzeptiert <img> mit Alt", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "RichText", props: { id: "r", html: '<img src="x" alt="Beschreibung">' } }])
    );
    expect(issues).toHaveLength(0);
  });

  it("meldet Image-Block ohne Alt (mit src)", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "Image", props: { id: "i", src: "x.jpg", alt: "" } }])
    );
    expect(issues.some((i) => i.message === "Bild ohne Alt-Text")).toBe(true);
  });

  it("meldet übersprungene Heading-Ebene (h2 → h4)", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "RichText", props: { id: "r", html: "<h2>A</h2><h4>B</h4>" } }])
    );
    expect(issues.some((i) => /übersprungen/.test(i.message))).toBe(true);
  });

  it("akzeptiert korrekte Heading-Folge (h2 → h3)", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "RichText", props: { id: "r", html: "<h2>A</h2><h3>B</h3>" } }])
    );
    expect(issues.filter((i) => /übersprungen/.test(i.message))).toHaveLength(0);
  });

  it("prüft Slot-Kinder rekursiv", () => {
    const issues = analyzePuckA11y(
      puck([
        {
          type: "Section",
          props: {
            id: "s",
            children: [{ type: "Image", props: { id: "i", src: "x", alt: "" } }],
          },
        },
      ])
    );
    expect(issues.some((i) => i.nodeId === "i")).toBe(true);
  });

  it("bezieht den Heading-Block in die Reihenfolge-Prüfung ein", () => {
    const issues = analyzePuckA11y(
      puck([
        { type: "Heading", props: { id: "h1", text: "A", level: 2 } },
        { type: "Heading", props: { id: "h2", text: "B", level: 4 } },
      ])
    );
    expect(issues.some((i) => /übersprungen/.test(i.message))).toBe(true);
  });

  it("meldet Galerie-Bilder ohne Alt-Text", () => {
    const issues = analyzePuckA11y(
      puck([
        {
          type: "Gallery",
          props: { id: "g", columns: 2, items: [{ src: "a.jpg", alt: "" }, { src: "b.jpg", alt: "ok" }] },
        },
      ])
    );
    expect(issues.some((i) => i.nodeId === "g" && /Galerie/.test(i.message))).toBe(true);
  });

  it("meldet Embed ohne Titel", () => {
    const issues = analyzePuckA11y(
      puck([{ type: "Embed", props: { id: "e", url: "https://youtu.be/abc" } }])
    );
    expect(issues.some((i) => i.nodeId === "e" && /Titel/.test(i.message))).toBe(true);
  });
});
