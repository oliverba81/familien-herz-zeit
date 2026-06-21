export interface InvoiceTaxResult {
  /** Nettobetrag in Cents (gerundet). */
  netCents: number;
  /** Umsatzsteuerbetrag in Cents (gerundet). */
  taxCents: number;
  /** Bruttobetrag in Cents (= Eingangsbetrag). */
  grossCents: number;
}

/**
 * Berechnet Netto- und Umsatzsteueranteil aus einem Bruttobetrag — pure, ohne IO.
 *
 * Verhaltensgleich zur bisherigen Inline-Logik im PDF-Generator:
 * - Kleinunternehmer (§19 UStG): keine USt, Netto = Brutto, Steuer = 0.
 * - Sonst: Netto = Brutto / (1 + taxRate/100), Steuer = Brutto − Netto.
 * Netto und Steuer werden auf ganze Cents gerundet (wie zuvor `Math.round`).
 *
 * @param grossCents Bruttobetrag in Cents (der tatsächlich gezahlte Betrag).
 * @param taxRate Steuersatz in Prozent (z. B. 19).
 * @param isSmallBusiness Kleinunternehmerregelung aktiv?
 */
export function computeInvoiceTax(
  grossCents: number,
  taxRate: number,
  isSmallBusiness: boolean
): InvoiceTaxResult {
  if (isSmallBusiness) {
    return { netCents: grossCents, taxCents: 0, grossCents };
  }

  const netExact = grossCents / (1 + taxRate / 100);
  const netCents = Math.round(netExact);
  const taxCents = Math.round(grossCents - netExact);

  return { netCents, taxCents, grossCents };
}
