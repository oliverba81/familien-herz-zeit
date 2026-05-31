import { DateTime } from "luxon";

const TIMEZONE = "Europe/Berlin";

/**
 * Konvertiert einen datetime-local String (YYYY-MM-DDTHH:mm) zu einem Date-Objekt
 * Wichtig: datetime-local gibt lokale Zeit ohne Zeitzone an
 * Diese Funktion behandelt die Eingabe als lokale Zeit (Europe/Berlin)
 */
export function parseDateTimeLocalToDate(value: string): Date {
  if (!value) {
    throw new Error("Datum/Zeit ist erforderlich");
  }

  // datetime-local Format: "YYYY-MM-DDTHH:mm"
  // Wir müssen dies als lokale Zeit interpretieren
  // new Date() interpretiert Strings ohne Zeitzone als lokale Zeit
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Ungültiges Datum/Zeit Format: ${value}`);
  }

  return date;
}

/**
 * Konvertiert ein Date-Objekt zu einem datetime-local Format (YYYY-MM-DDTHH:mm)
 * Verwendet die lokale Zeit des Date-Objekts
 */
export function dateToDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Konvertiert separate date (YYYY-MM-DD) und time (HH:mm) Strings zu einem UTC Date-Objekt
 * Interpretiert die Eingabe als Zeit in der Europe/Berlin Zeitzone
 * 
 * @param date - Datum im Format "YYYY-MM-DD"
 * @param time - Zeit im Format "HH:mm"
 * @returns Date-Objekt in UTC (für Datenbank-Speicherung)
 */
export function dateTimeToUtcDate(date: string, time: string): Date {
  if (!date || !time) {
    throw new Error("Datum und Zeit sind erforderlich");
  }

  // Kombiniere Datum und Zeit: "YYYY-MM-DD" + "HH:mm" -> "YYYY-MM-DDTHH:mm"
  const combined = `${date}T${time}`;
  
  // Interpretiere als Zeit in Europe/Berlin Zeitzone
  const dt = DateTime.fromISO(combined, { zone: TIMEZONE });
  
  if (!dt.isValid) {
    throw new Error(`Ungültiges Datum/Zeit Format: ${date} ${time}`);
  }

  // Konvertiere zu UTC Date für Datenbank
  return dt.toUTC().toJSDate();
}

/**
 * Konvertiert ein UTC Date-Objekt (aus der Datenbank) zu separaten date und time Strings
 * Zeigt die Zeit in der Europe/Berlin Zeitzone an
 * 
 * @param utcDate - Date-Objekt in UTC (aus Datenbank)
 * @returns Objekt mit date (YYYY-MM-DD) und time (HH:mm) Strings in lokaler Zeit
 */
export function utcDateToDateTime(utcDate: Date): { date: string; time: string } {
  // Konvertiere UTC Date zu Berlin-Zeit
  const dt = DateTime.fromJSDate(utcDate, { zone: "utc" }).setZone(TIMEZONE);
  
  if (!dt.isValid) {
    throw new Error(`Ungültiges UTC Date: ${utcDate}`);
  }

  return {
    date: dt.toFormat("yyyy-MM-dd"),
    time: dt.toFormat("HH:mm"),
  };
}

