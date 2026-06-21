import { describe, it, expect } from "vitest";
import {
  euroToCents,
  centsToEuro,
  formatCents,
  parseEuroToCents,
} from "./money";

describe("euroToCents", () => {
  it("konvertiert ganze Euro korrekt", () => {
    expect(euroToCents(10)).toBe(1000);
    expect(euroToCents(0)).toBe(0);
  });

  it("vermeidet Floating-Point-Fehler bei Dezimalbeträgen", () => {
    expect(euroToCents(19.99)).toBe(1999);
    expect(euroToCents(0.1)).toBe(10);
    expect(euroToCents(0.01)).toBe(1);
    expect(euroToCents(0.07)).toBe(7);
  });
});

describe("centsToEuro", () => {
  it("konvertiert Cents zurück zu Euro", () => {
    expect(centsToEuro(1999)).toBe(19.99);
    expect(centsToEuro(0)).toBe(0);
    expect(centsToEuro(1)).toBe(0.01);
  });

  it("ist invers zu euroToCents", () => {
    for (const euro of [0, 0.01, 0.99, 19.99, 100, 1234.56]) {
      expect(centsToEuro(euroToCents(euro))).toBeCloseTo(euro, 2);
    }
  });
});

describe("formatCents", () => {
  it("formatiert Cents als deutschen Euro-String", () => {
    // Intl nutzt ein schmales geschütztes Leerzeichen (NBSP/NNBSP) vor dem €.
    expect(formatCents(1999).replace(/\s/g, " ")).toBe("19,99 €");
    expect(formatCents(0).replace(/\s/g, " ")).toBe("0,00 €");
    expect(formatCents(100000).replace(/\s/g, " ")).toBe("1.000,00 €");
  });
});

describe("parseEuroToCents", () => {
  it("parst deutsches Komma-Format", () => {
    expect(parseEuroToCents("19,99")).toBe(1999);
    expect(parseEuroToCents("0,01")).toBe(1);
  });

  it("parst Punkt-Format", () => {
    expect(parseEuroToCents("19.99")).toBe(1999);
  });

  it("parst deutsches Format mit Tausenderpunkt", () => {
    expect(parseEuroToCents("1.234,56")).toBe(123456);
  });

  it("toleriert umgebende Leerzeichen", () => {
    expect(parseEuroToCents("  10  ")).toBe(1000);
  });

  it("gibt null bei ungültiger Eingabe zurück (kein NaN)", () => {
    expect(parseEuroToCents("")).toBeNull();
    expect(parseEuroToCents("   ")).toBeNull();
    expect(parseEuroToCents("abc")).toBeNull();
    expect(parseEuroToCents("12,,3")).toBeNull();
    expect(parseEuroToCents(null)).toBeNull();
    expect(parseEuroToCents(undefined)).toBeNull();
    expect(parseEuroToCents("-5")).toBeNull();
  });
});
