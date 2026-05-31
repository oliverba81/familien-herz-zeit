import { db } from "@/lib/db";
import { generateOccurrences } from "./series-generator";

export interface SafeSyncResult {
  created: number;
  updated: number;
  cancelled: number;
  skippedLocked: number;
  keptBecauseBooked: number;
  warnings: string[];
  details: {
    created: Array<{ startAt: Date; title: string }>;
    updated: Array<{ courseId: string; startAt: Date; title: string }>;
    cancelled: Array<{ courseId: string; startAt: Date; title: string }>;
    skippedLocked: Array<{ courseId: string; startAt: Date; title: string; reason: string }>;
    keptBecauseBooked: Array<{ courseId: string; startAt: Date; title: string; bookingCount: number }>;
  };
}

/**
 * Sicherer Sync: Aktualisiert Termine nur wenn keine Buchungen vorhanden
 * Entfernte Termine werden CANCELLED (wenn keine Buchungen) oder bleiben bestehen (mit Warnung)
 */
export async function syncSeriesOccurrencesSafe(seriesId: string): Promise<SafeSyncResult> {
  // Lade Serie
  const series = await db.courseSeries.findUnique({
    where: { id: seriesId },
  });

  if (!series) {
    throw new Error("Serie nicht gefunden");
  }

  // Generiere Occurrences
  const generatedOccurrences = generateOccurrences(series);

  // Lade bestehende Termine mit Sessions
  const existingCourses = await db.course.findMany({
    where: { seriesId },
    include: {
      sessions: {
        orderBy: {
          startAt: "asc",
        },
        take: 1, // Nur erste Session für Vergleich
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: {
                in: ["PENDING", "CONFIRMED"],
              },
            },
          },
        },
      },
    },
  });

  // Maps bauen - verwende erste Session's startAt
  const generatedMap = new Map(
    generatedOccurrences.map((occ) => [occ.startAt.toISOString(), occ])
  );
  const existingMap = new Map(
    existingCourses
      .filter((c) => c.sessions.length > 0)
      .map((course) => [course.sessions[0].startAt.toISOString(), course])
  );

  // Kategorien
  const toCreate: typeof generatedOccurrences = [];
  const toUpdate: Array<{ course: typeof existingCourses[0]; occurrence: typeof generatedOccurrences[0] }> = [];
  const toRemoved: typeof existingCourses = [];

  // Finde zu erstellende Termine
  for (const occ of generatedOccurrences) {
    const key = occ.startAt.toISOString();
    if (!existingMap.has(key)) {
      toCreate.push(occ);
    } else {
      // Bestehender Termin - prüfe ob Update nötig
      const existing = existingMap.get(key)!;
      toUpdate.push({ course: existing, occurrence: occ });
    }
  }

  // Finde entfernte Termine (nicht mehr in generated)
  for (const course of existingCourses) {
    if (course.sessions.length === 0) {
      // Kurs ohne Session - als entfernt behandeln
      toRemoved.push(course);
      continue;
    }
    const key = course.sessions[0].startAt.toISOString();
    if (!generatedMap.has(key)) {
      toRemoved.push(course);
    }
  }

  const result: SafeSyncResult = {
    created: 0,
    updated: 0,
    cancelled: 0,
    skippedLocked: 0,
    keptBecauseBooked: 0,
    warnings: [],
    details: {
      created: [],
      updated: [],
      cancelled: [],
      skippedLocked: [],
      keptBecauseBooked: [],
    },
  };

  // Erstelle neue Termine mit Session
  for (const occ of toCreate) {
    try {
      const { startAt, durationMinutes, ...courseData } = occ;
      await db.course.create({
        data: {
          ...courseData,
          sessions: {
            create: {
              startAt: occ.startAt,
              durationMinutes: occ.durationMinutes,
            },
          },
        },
      });
      result.created++;
      result.details.created.push({
        startAt: occ.startAt,
        title: occ.title,
      });
    } catch (error: any) {
      result.warnings.push(`Fehler beim Erstellen von Termin ${occ.startAt.toISOString()}: ${error.message}`);
    }
  }

  // Update bestehende Termine
  for (const { course, occurrence } of toUpdate) {
    const hasBookings = course._count.bookings > 0;

    if (hasBookings) {
      // Nur "ungefährliche" Felder updaten
      try {
        await db.course.update({
          where: { id: course.id },
          data: {
            title: occurrence.title,
            description: occurrence.description,
            location: occurrence.location,
            // NICHT: startAt, durationMinutes, maxParticipants, priceCents, status
          },
        });
        result.updated++;
        const firstSessionStartAt = course.sessions[0]?.startAt || new Date();
        result.details.updated.push({
          courseId: course.id,
          startAt: firstSessionStartAt,
          title: course.title,
        });
      } catch (error: any) {
        result.skippedLocked++;
        const firstSessionStartAt = course.sessions[0]?.startAt || new Date();
        result.details.skippedLocked.push({
          courseId: course.id,
          startAt: firstSessionStartAt,
          title: course.title,
          reason: "Fehler beim Update",
        });
        result.warnings.push(`Termin ${course.title} (${firstSessionStartAt.toISOString()}) konnte nicht aktualisiert werden: ${error.message}`);
      }
    } else {
      // Keine Buchungen - alle Felder updaten
      try {
        const { startAt, durationMinutes, ...courseData } = occurrence;
        
        // Update Kurs
        await db.course.update({
          where: { id: course.id },
          data: {
            ...courseData,
          },
        });

        // Update oder erstelle erste Session
        if (course.sessions[0]) {
          await db.courseSession.update({
            where: { id: course.sessions[0].id },
            data: {
              startAt: occurrence.startAt,
              durationMinutes: occurrence.durationMinutes,
            },
          });
        } else {
          await db.courseSession.create({
            data: {
              courseId: course.id,
              startAt: occurrence.startAt,
              durationMinutes: occurrence.durationMinutes,
            },
          });
        }

        result.updated++;
        result.details.updated.push({
          courseId: course.id,
          startAt: occurrence.startAt,
          title: course.title,
        });
      } catch (error: any) {
        result.warnings.push(`Fehler beim Update von Termin ${course.id}: ${error.message}`);
      }
    }
  }

  // Behandle entfernte Termine
  for (const course of toRemoved) {
    const hasBookings = course._count.bookings > 0;

    if (hasBookings) {
      // Termin mit Buchungen bleibt bestehen
      const firstSessionStartAt = course.sessions[0]?.startAt || new Date();
      result.keptBecauseBooked++;
      result.details.keptBecauseBooked.push({
        courseId: course.id,
        startAt: firstSessionStartAt,
        title: course.title,
        bookingCount: course._count.bookings,
      });
      result.warnings.push(
        `Termin "${course.title}" (${firstSessionStartAt.toISOString()}) wurde nicht entfernt, da ${course._count.bookings} Buchung(en) vorhanden sind.`
      );
    } else {
      // Keine Buchungen - auf CANCELLED setzen
      try {
        await db.course.update({
          where: { id: course.id },
          data: {
            status: "CANCELLED",
            description: `${course.description}\n\n[Automatisch abgesagt: Termin entfällt wegen Serienänderung]`,
          },
        });
        result.cancelled++;
        const firstSessionStartAt = course.sessions[0]?.startAt || new Date();
        result.details.cancelled.push({
          courseId: course.id,
          startAt: firstSessionStartAt,
          title: course.title,
        });
      } catch (error: any) {
        result.warnings.push(`Fehler beim Absagen von Termin ${course.id}: ${error.message}`);
      }
    }
  }

  return result;
}

