import { describe, it, expect } from "vitest";
import { colsTemplateValue, colsNumberValue, columnsTemplate } from "./blocks";

describe("colsTemplateValue (per-Breakpoint-Spalten → grid-template)", () => {
  it("liefert null für 'auto'/leer (erbt Default)", () => {
    expect(colsTemplateValue("auto")).toBeNull();
    expect(colsTemplateValue("")).toBeNull();
    expect(colsTemplateValue(undefined)).toBeNull();
  });

  it("mappt 1 auf '1fr', >1 auf repeat()", () => {
    expect(colsTemplateValue("1")).toBe("1fr");
    expect(colsTemplateValue("2")).toBe("repeat(2, minmax(0, 1fr))");
    expect(colsTemplateValue("4")).toBe("repeat(4, minmax(0, 1fr))");
  });

  it("verwirft ungültige Werte", () => {
    expect(colsTemplateValue("0")).toBeNull();
    expect(colsTemplateValue("abc")).toBeNull();
    expect(colsTemplateValue("99")).toBeNull();
  });
});

describe("colsNumberValue (per-Breakpoint-Spalten → Zahl-String)", () => {
  it("liefert null für 'auto'/leer", () => {
    expect(colsNumberValue("auto")).toBeNull();
    expect(colsNumberValue(undefined)).toBeNull();
  });

  it("liefert die Zahl als String", () => {
    expect(colsNumberValue("2")).toBe("2");
    expect(colsNumberValue("3")).toBe("3");
  });

  it("verwirft ungültige Werte", () => {
    expect(colsNumberValue("0")).toBeNull();
    expect(colsNumberValue("x")).toBeNull();
  });
});

describe("columnsTemplate (Verhältnis → grid-template)", () => {
  it("nutzt das Verhältnis, wenn es zur Spaltenzahl passt", () => {
    expect(columnsTemplate(2, "2-1")).toBe("2fr 1fr");
    expect(columnsTemplate(3, "1-2-1")).toBe("1fr 2fr 1fr");
  });

  it("fällt auf gleiche Spalten zurück (ohne Verhältnis oder zu wenige Anteile)", () => {
    expect(columnsTemplate(2)).toBe("repeat(2, minmax(0, 1fr))");
    // Verhältnis mit weniger Anteilen als Spalten → Fallback.
    expect(columnsTemplate(3, "2-1")).toBe("repeat(3, minmax(0, 1fr))");
  });

  it("kürzt ein zu langes Verhältnis auf die Spaltenzahl", () => {
    expect(columnsTemplate(2, "1-2-1")).toBe("1fr 2fr");
  });
});
