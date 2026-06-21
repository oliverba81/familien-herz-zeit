import { describe, it, expect } from "vitest";
import {
  truncateAtWordBoundary,
  extractTextFromContent,
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
});

describe("absoluteUrl", () => {
  it("ergänzt einen führenden Slash", () => {
    expect(absoluteUrl("kurse")).toMatch(/\/kurse$/);
    expect(absoluteUrl("/kurse")).toMatch(/\/kurse$/);
  });
});
