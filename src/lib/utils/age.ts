/**
 * Berechnet das Alter eines Kindes in vollen Monaten zum Stichtag.
 *
 * @param birthDate Geburtsdatum.
 * @param now Stichtag (Standard: aktueller Zeitpunkt). Optional, damit die
 *   Berechnung deterministisch testbar ist und nicht von der Systemzeit abhängt.
 * @returns Alter in Monaten (>= 0). Bei ungültigem Geburtsdatum: 0.
 */
export function getChildAgeMonths(birthDate: Date, now: Date = new Date()): number {
  // Schutz gegen ungültige Datumswerte (z. B. aus `new Date("ungültig")`),
  // damit nicht NaN in die Buchung gelangt.
  if (Number.isNaN(birthDate.getTime())) return 0;

  const monthsDiff =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  return monthsDiff >= 0 ? monthsDiff : 0;
}
