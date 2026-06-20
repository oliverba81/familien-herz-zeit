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

/**
 * Parst eine Benutzereingabe (Euro als String) sicher in Cents.
 *
 * Akzeptiert sowohl Komma- als auch Punkt-Dezimaltrennzeichen (z. B. "19,99"
 * oder "19.99") sowie Tausenderpunkte im deutschen Format ("1.234,56").
 * Gibt `null` zurück, wenn die Eingabe leer, kein gültiger Betrag oder negativ
 * ist — damit ungültige Eingaben NICHT als `NaN` weiterverarbeitet werden.
 *
 * @param input Roh-Eingabe (String). `null`/`undefined` werden als ungültig behandelt.
 * @returns Betrag in Cents (>= 0) oder `null` bei ungültiger Eingabe.
 */
export function parseEuroToCents(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  const trimmed = String(input).trim();
  if (trimmed === "") return null;

  // Normalisiere deutsches Format: Wenn sowohl "." als auch "," vorkommen,
  // ist "." der Tausendertrenner und "," das Dezimaltrennzeichen.
  let normalized = trimmed;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    // Nur Komma -> Dezimaltrennzeichen.
    normalized = normalized.replace(",", ".");
  }

  // Erlaube nur Ziffern, ein optionales Vorzeichen und genau einen Dezimalpunkt.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const euro = Number(normalized);
  if (!Number.isFinite(euro) || euro < 0) return null;

  return euroToCents(euro);
}

