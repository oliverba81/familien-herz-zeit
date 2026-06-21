import { describe, it, expect } from "vitest";
import { discountCodeSchema } from "./discounts";

const base = {
  code: "SOMMER10",
  provider: "STRIPE" as const,
  currency: "eur",
  isActive: true,
};

describe("discountCodeSchema", () => {
  it("akzeptiert einen gültigen PERCENT-Rabatt", () => {
    const result = discountCodeSchema.safeParse({
      ...base,
      type: "PERCENT",
      percentOff: 10,
    });
    expect(result.success).toBe(true);
  });

  it("akzeptiert einen gültigen AMOUNT-Rabatt", () => {
    const result = discountCodeSchema.safeParse({
      ...base,
      type: "AMOUNT",
      amountOffCents: 500,
    });
    expect(result.success).toBe(true);
  });

  it("lehnt PERCENT ohne percentOff ab", () => {
    const result = discountCodeSchema.safeParse({ ...base, type: "PERCENT" });
    expect(result.success).toBe(false);
  });

  it("lehnt AMOUNT ohne amountOffCents ab", () => {
    const result = discountCodeSchema.safeParse({ ...base, type: "AMOUNT" });
    expect(result.success).toBe(false);
  });

  it("lehnt percentOff über 100 ab", () => {
    const result = discountCodeSchema.safeParse({
      ...base,
      type: "PERCENT",
      percentOff: 150,
    });
    expect(result.success).toBe(false);
  });

  it("lehnt ungültige Code-Zeichen ab", () => {
    const result = discountCodeSchema.safeParse({
      ...base,
      code: "sommer 10!",
      type: "PERCENT",
      percentOff: 10,
    });
    expect(result.success).toBe(false);
  });
});
