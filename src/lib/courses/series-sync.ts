import { db } from "@/lib/db";
import { generateOccurrences } from "./series-generator";

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  errors: number;
}

/**
 * Synchronisiert Course-Occurrences für eine Serie
 * Verwendet Upsert, um doppelte Termine zu vermeiden
 */
export async function syncSeriesOccurrences(seriesId: string): Promise<SyncResult> {
  // Lade Serie
  const series = await db.courseSeries.findUnique({
    where: { id: seriesId },
  });

  if (!series) {
    throw new Error("Serie nicht gefunden");
  }

  // Generiere Occurrences
  const occurrences = generateOccurrences(series);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  // Bestehende Termine laden (für created/updated Unterscheidung)
  const existingCourses = await db.course.findMany({
    where: { seriesId },
    include: {
      sessions: {
        orderBy: {
          startAt: "asc",
        },
        take: 1, // Nur die erste Session für Vergleich
      },
    },
  });

  const existingMap = new Map(
    existingCourses
      .filter((c) => c.sessions.length > 0)
      .map((c) => [c.sessions[0].startAt.toISOString(), c.id])
  );

  // Upsert jedes Occurrence
  for (const occurrence of occurrences) {
    try {
      const startAtKey = occurrence.startAt.toISOString();
      const existingId = existingMap.get(startAtKey);

      if (existingId) {
        // Update bestehenden Kurs
        const { startAt, durationMinutes, ...courseData } = occurrence;
        
        // Finde erste Session
        const existingCourse = await db.course.findUnique({
          where: { id: existingId },
          include: {
            sessions: {
              orderBy: { startAt: "asc" },
              take: 1,
            },
          },
        });

        // Update Kurs
        await db.course.update({
          where: { id: existingId },
          data: {
            ...courseData,
          },
        });

        // Update oder erstelle erste Session
        if (existingCourse?.sessions[0]) {
          await db.courseSession.update({
            where: { id: existingCourse.sessions[0].id },
            data: {
              startAt: occurrence.startAt,
              durationMinutes: occurrence.durationMinutes,
            },
          });
        } else {
          await db.courseSession.create({
            data: {
              courseId: existingId,
              startAt: occurrence.startAt,
              durationMinutes: occurrence.durationMinutes,
            },
          });
        }
        
        updated++;
      } else {
        // Erstelle neuen Kurs mit Session
        const { startAt, ...courseData } = occurrence;
        await db.course.create({
          data: {
            ...courseData,
            sessions: {
              create: {
                startAt: occurrence.startAt,
                durationMinutes: occurrence.durationMinutes,
              },
            },
          },
        });
        created++;
      }
      processed++;
    } catch (error: any) {
      console.error(`Fehler beim Sync von Occurrence ${occurrence.startAt}:`, error);
      errors++;
    }
  }

  return {
    processed,
    created,
    updated,
    errors,
  };
}

