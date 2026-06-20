import { describe, it, expect } from "vitest";
import { slugify, createUniqueSlug } from "./slug";

describe("slugify", () => {
  it("wandelt in Kleinbuchstaben und ersetzt Leerzeichen", () => {
    expect(slugify("Hallo Welt")).toBe("hallo-welt");
  });

  it("ersetzt deutsche Umlaute", () => {
    expect(slugify("Käse Möhren Über Straße")).toBe("kaese-moehren-ueber-strasse");
  });

  it("entfernt führende/abschließende und doppelte Bindestriche", () => {
    expect(slugify("  --Hallo   Welt--  ")).toBe("hallo-welt");
    expect(slugify("a / b / c")).toBe("a-b-c");
  });

  it("entfernt Sonderzeichen", () => {
    expect(slugify("Kurs #1: Babymassage!")).toBe("kurs-1-babymassage");
  });
});

describe("createUniqueSlug", () => {
  it("gibt den Basis-Slug zurück, wenn er eindeutig ist", async () => {
    const slug = await createUniqueSlug("kurs", async () => true);
    expect(slug).toBe("kurs");
  });

  it("hängt ein Suffix an, bis der Slug eindeutig ist", async () => {
    const taken = new Set(["kurs", "kurs-1"]);
    const slug = await createUniqueSlug("kurs", async (s) => !taken.has(s));
    expect(slug).toBe("kurs-2");
  });
});
