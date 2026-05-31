/**
 * Formatiert einen Preis in Cents zu einem formatierten String
 * @param priceCents Preis in Cents
 * @param currency Währung (Standard: EUR)
 * @param locale Locale für Formatierung (Standard: de-DE)
 * @returns Formatierter Preis-String
 */
export function formatCents(
  priceCents: number,
  currency: string = "EUR",
  locale: string = "de-DE"
): string {
  // Konvertiere Cents zu Euro mit präziser Berechnung
  const amount = Math.round(priceCents) / 100;
  // Runde auf 2 Dezimalstellen, um Floating-Point-Fehler zu vermeiden
  const roundedAmount = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundedAmount);
}

/**
 * Konvertiert Euro zu Cents
 * Verwendet präzise Berechnung, um Floating-Point-Fehler zu vermeiden
 */
export function euroToCents(euro: number): number {
  // Multipliziere mit 100 und runde, um Floating-Point-Fehler zu vermeiden
  // Verwende Math.round für zusätzliche Sicherheit
  return Math.round(Math.round(euro * 100));
}

/**
 * Konvertiert Cents zu Euro
 * Gibt eine präzise Dezimalzahl zurück
 */
export function centsToEuro(cents: number): number {
  // Teile durch 100 - sollte präzise sein für ganze Zahlen
  const result = cents / 100;
  // Runde auf 2 Dezimalstellen, um Floating-Point-Fehler zu vermeiden
  return Math.round(result * 100) / 100;
}

/**
 * Formatiert Cents zu Euro-String (Alias für formatCents)
 */
export function formatEuroFromCents(cents: number): string {
  return formatCents(cents, "EUR", "de-DE");
}

