import { describe, it, expect } from "vitest";
import { computeDiscountedPrice } from "./pricing";

describe("computeDiscountedPrice", () => {
  it("berechnet prozentuale Rabatte (abgerundet)", () => {
    expect(
      computeDiscountedPrice(10000, "PERCENT", { percentOff: 33 })
    ).toEqual({ discountCents: 3300, newPriceCents: 6700 });

    // Abrundung: 25% von 1999 = 499.75 -> 499
    expect(
      computeDiscountedPrice(1999, "PERCENT", { percentOff: 25 })
    ).toEqual({ discountCents: 499, newPriceCents: 1500 });
  });

  it("berechnet feste Betrags-Rabatte und deckelt auf den Preis", () => {
    expect(
      computeDiscountedPrice(10000, "AMOUNT", { amountOffCents: 2500 })
    ).toEqual({ discountCents: 2500, newPriceCents: 7500 });

    // Rabatt größer als Preis -> Endpreis 0, nicht negativ
    expect(
      computeDiscountedPrice(2000, "AMOUNT", { amountOffCents: 5000 })
    ).toEqual({ discountCents: 2000, newPriceCents: 0 });
  });

  it("gibt keinen Rabatt, wenn Werte fehlen", () => {
    expect(
      computeDiscountedPrice(10000, "PERCENT", { percentOff: null })
    ).toEqual({ discountCents: 0, newPriceCents: 10000 });
    expect(
      computeDiscountedPrice(10000, "AMOUNT", { amountOffCents: 0 })
    ).toEqual({ discountCents: 0, newPriceCents: 10000 });
  });

  it("100% Rabatt ergibt Preis 0", () => {
    expect(
      computeDiscountedPrice(10000, "PERCENT", { percentOff: 100 })
    ).toEqual({ discountCents: 10000, newPriceCents: 0 });
  });
});
