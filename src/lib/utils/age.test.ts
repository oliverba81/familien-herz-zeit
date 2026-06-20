import { describe, it, expect } from "vitest";
import { getChildAgeMonths } from "./age";

describe("getChildAgeMonths", () => {
  const now = new Date("2026-06-20T12:00:00Z");

  it("berechnet das Alter in vollen Monaten zum Stichtag", () => {
    expect(getChildAgeMonths(new Date("2025-06-20"), now)).toBe(12);
    expect(getChildAgeMonths(new Date("2026-03-20"), now)).toBe(3);
    expect(getChildAgeMonths(new Date("2024-06-20"), now)).toBe(24);
  });

  it("gibt 0 zurück, wenn das Geburtsdatum in der Zukunft liegt", () => {
    expect(getChildAgeMonths(new Date("2026-12-20"), now)).toBe(0);
  });

  it("gibt 0 bei ungültigem Geburtsdatum zurück (kein NaN)", () => {
    expect(getChildAgeMonths(new Date("ungültig"), now)).toBe(0);
  });

  it("ist deterministisch über den now-Parameter", () => {
    const result1 = getChildAgeMonths(new Date("2025-01-01"), new Date("2026-01-01"));
    const result2 = getChildAgeMonths(new Date("2025-01-01"), new Date("2026-01-01"));
    expect(result1).toBe(12);
    expect(result2).toBe(12);
  });
});
