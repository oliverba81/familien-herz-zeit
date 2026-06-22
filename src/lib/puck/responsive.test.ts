import { describe, it, expect } from "vitest";
import { getResponsiveClasses, RESPONSIVE_CLASS } from "./responsive";

describe("getResponsiveClasses", () => {
  it("leer ohne Flags", () => {
    expect(getResponsiveClasses({})).toBe("");
    expect(getResponsiveClasses({ hideMobile: false })).toBe("");
  });

  it("einzelne Flags", () => {
    expect(getResponsiveClasses({ hideMobile: true })).toBe(RESPONSIVE_CLASS.hideMobile);
    expect(getResponsiveClasses({ hideDesktop: true })).toBe(RESPONSIVE_CLASS.hideDesktop);
  });

  it("kombinierte Flags in fester Reihenfolge", () => {
    const cls = getResponsiveClasses({ hideMobile: true, hideTablet: true, hideDesktop: true });
    expect(cls).toBe(
      `${RESPONSIVE_CLASS.hideMobile} ${RESPONSIVE_CLASS.hideTablet} ${RESPONSIVE_CLASS.hideDesktop}`
    );
  });

  it("ignoriert nicht-true Werte (nur strikt true zählt)", () => {
    expect(getResponsiveClasses({ hideMobile: "true" as unknown as boolean })).toBe("");
    expect(getResponsiveClasses({ hideMobile: 1 as unknown as boolean })).toBe("");
  });
});
