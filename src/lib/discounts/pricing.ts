/**
 * Rabatttyp als String-Union — entspricht dem Prisma-Enum `DiscountType`
 * ("PERCENT" | "AMOUNT"), aber ohne Abhängigkeit zum generierten Prisma-Client,
 * damit diese pure Funktion ohne `prisma generate` testbar bleibt.
 */
export type DiscountKind = "PERCENT" | "AMOUNT";

export interface DiscountPricingResult {
  discountCents: number;
  newPriceCents: number;
}

/**
 * Berechnet den reduzierten Preis für einen Rabatt — pure, ohne DB.
 *
 * Verhaltensgleich zur bisherigen Inline-Logik in `validateDiscount`:
 * - PERCENT: abgerundeter Prozentbetrag (`Math.floor`), damit nie zugunsten
 *   des Kunden aufgerundet wird.
 * - AMOUNT: fester Betrag, gedeckelt auf den Preis (`Math.min`).
 * Der Endpreis wird bei 0 gekappt (`Math.max(0, …)`).
 *
 * @param priceCents Ausgangspreis in Cents.
 * @param type Rabatttyp (PERCENT oder AMOUNT).
 * @param opts percentOff (0–100) bzw. amountOffCents.
 */
export function computeDiscountedPrice(
  priceCents: number,
  type: DiscountKind,
  opts: { percentOff?: number | null; amountOffCents?: number | null }
): DiscountPricingResult {
  let discountCents = 0;

  if (type === "PERCENT" && opts.percentOff) {
    discountCents = Math.floor((priceCents * opts.percentOff) / 100);
  } else if (type === "AMOUNT" && opts.amountOffCents) {
    discountCents = Math.min(opts.amountOffCents, priceCents);
  }

  const newPriceCents = Math.max(0, priceCents - discountCents);

  return { discountCents, newPriceCents };
}
