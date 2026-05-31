/**
 * Konvertiert ein Date-Objekt zu einem ISO-String für Query-Parameter
 */
export function toIsoForQuery(date: Date): string {
  return date.toISOString();
}

/**
 * Parst einen ISO-String aus Query-Parametern zu einem Date-Objekt
 */
export function parseIsoFromQuery(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  try {
    const date = new Date(value);
    // Prüfe ob gültiges Date
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Konvertiert ein Date-Objekt zu einem datetime-local Format (YYYY-MM-DDTHH:mm)
 * Wichtig: datetime-local arbeitet ohne Timezone, daher lokale Zeit
 * Diese Funktion verwendet die lokale Zeit des Date-Objekts
 */
export function toDateTimeLocal(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Verwende lokale Zeit (getFullYear, getMonth, etc. geben lokale Zeit zurück)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parst einen datetime-local String zu einem Date-Objekt
 * Wichtig: Interpretiert als lokale Zeit
 */
export function parseDateTimeLocal(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  try {
    // datetime-local Format: YYYY-MM-DDTHH:mm
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

