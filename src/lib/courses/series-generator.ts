import { CourseSeries } from "@prisma/client";
import { DateTime } from "luxon";

export interface OccurrenceData {
  startAt: Date;
  title: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  maxParticipants: number;
  location: string | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  seriesId: string;
}

/**
 * Generiert Course-Occurrences aus einer CourseSeries
 */
export function generateOccurrences(series: CourseSeries): OccurrenceData[] {
  const occurrences: OccurrenceData[] = [];

  // Parse Wochentage
  const weekdays = series.weekdays as number[]; // [1,3,5] für Mo/Mi/Fr

  // Parse Start-Zeit
  const [hh, mm] = series.startTime.split(":").map(Number);

  // Start- und End-Datum in Berlin-Zeitzone
  const startDate = DateTime.fromJSDate(series.startDate, { zone: series.timezone });
  const endDate = DateTime.fromJSDate(series.endDate, { zone: series.timezone });

  // Start-Woche für Intervall-Berechnung
  const startWeek = startDate.startOf("week");

  // Iteriere durch alle Tage von startDate bis endDate
  let currentDate = startDate.startOf("day");

  while (currentDate <= endDate) {
    // Prüfe ob Wochentag in weekdays enthalten ist
    const weekday = currentDate.weekday; // 1=Mo, 7=So
    if (weekdays.includes(weekday)) {
      // Prüfe Intervall (jede n-te Woche)
      const currentWeek = currentDate.startOf("week");
      const weeksDiff = Math.floor(currentWeek.diff(startWeek, "weeks").weeks);

      if (weeksDiff % series.intervalWeeks === 0) {
        // Erstelle DateTime mit Start-Zeit
        const startAtBerlin = currentDate.set({
          hour: hh,
          minute: mm,
          second: 0,
          millisecond: 0,
        });

        // Konvertiere zu UTC Date für Datenbank
        const startAtUtcDate = startAtBerlin.toUTC().toJSDate();

        occurrences.push({
          startAt: startAtUtcDate,
          title: series.title,
          description: series.description,
          durationMinutes: series.durationMinutes,
          priceCents: series.priceCents,
          maxParticipants: series.maxParticipants,
          location: series.location,
          status: series.status,
          seriesId: series.id,
        });
      }
    }

    // Nächster Tag
    currentDate = currentDate.plus({ days: 1 });
  }

  return occurrences;
}

