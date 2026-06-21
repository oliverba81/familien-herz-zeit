import { describe, it, expect } from "vitest";
import { computeInvoiceTax } from "./tax";

describe("computeInvoiceTax", () => {
  it("Kleinunternehmer: keine USt, Netto = Brutto", () => {
    expect(computeInvoiceTax(1999, 19, true)).toEqual({
      netCents: 1999,
      taxCents: 0,
      grossCents: 1999,
    });
  });

  it("berechnet Netto und USt aus Brutto (19%)", () => {
    // 119,00 € brutto -> 100,00 € netto, 19,00 € USt
    expect(computeInvoiceTax(11900, 19, false)).toEqual({
      netCents: 10000,
      taxCents: 1900,
      grossCents: 11900,
    });
  });

  it("rundet Netto und Steuer auf ganze Cents", () => {
    // 19,99 € brutto bei 19%: netto = 1999/1.19 = 1679.83 -> 1680, Steuer -> 319
    const result = computeInvoiceTax(1999, 19, false);
    expect(result.netCents).toBe(1680);
    expect(result.taxCents).toBe(319);
    // Netto + Steuer == Brutto (Rundung darf nicht auseinanderlaufen)
    expect(result.netCents + result.taxCents).toBe(1999);
  });

  it("funktioniert mit 7% Steuersatz", () => {
    // 107,00 € brutto -> 100,00 € netto, 7,00 € USt
    expect(computeInvoiceTax(10700, 7, false)).toEqual({
      netCents: 10000,
      taxCents: 700,
      grossCents: 10700,
    });
  });
});
