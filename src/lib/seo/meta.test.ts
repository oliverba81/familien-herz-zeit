import { describe, it, expect } from "vitest";
import {
  truncateAtWordBoundary,
  extractTextFromContent,
  extractTextFromContentForAI,
  extractTextFromPuck,
  absoluteUrl,
} from "./meta";

describe("truncateAtWordBoundary", () => {
  it("lässt kurze Texte unverändert", () => {
    expect(truncateAtWordBoundary("Kurzer Text", 158)).toBe("Kurzer Text");
  });

  it("kürzt an der letzten Wortgrenze", () => {
    const text = "Dies ist ein langer Satz der gekürzt werden soll hier";
    const result = truncateAtWordBoundary(text, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).not.toMatch(/\s$/);
    // Kein abgeschnittenes Wort am Ende
    expect(text.startsWith(result)).toBe(true);
  });
});

describe("extractTextFromContent", () => {
  it("extrahiert Klartext aus V2-HTML-Content", () => {
    const content = { version: 2, html: "<p>Hallo <strong>Welt</strong></p>" };
    expect(extractTextFromContent(content, 160)).toBe("Hallo Welt");
  });

  it("extrahiert den ersten Absatz aus V1-Block-Array", () => {
    const content = [
      { type: "paragraph", children: [{ text: "Erster Absatz" }] },
    ];
    expect(extractTextFromContent(content, 160)).toBe("Erster Absatz");
  });

  it("gibt leeren String für leeren Content zurück", () => {
    expect(extractTextFromContent(null)).toBe("");
    expect(extractTextFromContent(undefined)).toBe("");
  });

  it("extrahiert Text aus V3-Puck-Content (statt leer)", () => {
    const puck = {
      version: 3,
      root: { props: { title: "Startseite" } },
      content: [
        { type: "RichText", props: { id: "r1", html: "<p>Willkommen <em>hier</em></p>" } },
        {
          type: "Section",
          props: {
            id: "s1",
            children: [{ type: "RichText", props: { id: "r2", html: "<h2>Kurse</h2>" } }],
          },
        },
      ],
    };
    const text = extractTextFromContent(puck, 160);
    expect(text).toContain("Willkommen hier");
    expect(text).toContain("Kurse");
    expect(text).not.toBe("");
  });
});

describe("extractTextFromPuck / AI-Kontext", () => {
  it("sammelt Text rekursiv aus Slot-Kindern", () => {
    const puck = {
      version: 3 as const,
      root: { props: { title: "T" } },
      content: [
        {
          type: "Section",
          props: {
            id: "s",
            children: [{ type: "RichText", props: { id: "r", html: "<p>Tiefer Text</p>" } }],
          },
        },
      ],
    };
    expect(extractTextFromPuck(puck, 3000)).toContain("Tiefer Text");
  });

  it("extractTextFromContentForAI liefert für Puck nicht-leeren Text", () => {
    const puck = {
      version: 3,
      root: {},
      content: [{ type: "RichText", props: { id: "r", html: "<p>KI-Kontext</p>" } }],
    };
    expect(extractTextFromContentForAI(puck, 3000)).toContain("KI-Kontext");
  });
});

describe("absoluteUrl", () => {
  it("ergänzt einen führenden Slash", () => {
    expect(absoluteUrl("kurse")).toMatch(/\/kurse$/);
    expect(absoluteUrl("/kurse")).toMatch(/\/kurse$/);
  });
});
