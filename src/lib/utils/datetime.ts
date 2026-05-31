/**
 * Formatiert ein Datum im Berliner Format (de-DE)
 * @param date Datum als Date-Objekt oder ISO-String
 * @returns Formatierter Datum-String
 */
export function formatBerlinDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(dateObj);
}

/**
 * Formatiert nur das Datum (ohne Zeit)
 */
export function formatBerlinDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Formatiert nur die Zeit
 */
export function formatBerlinTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

