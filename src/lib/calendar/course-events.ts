import { Course, CourseStatus, CourseSession } from "@prisma/client";

type CourseWithSeries = Course & {
  series?: {
    id: string;
    title: string;
  } | null;
  sessions?: CourseSession[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  extendedProps?: {
    courseId: string;
    sessionId?: string;
    status: CourseStatus;
    location?: string | null;
    priceCents: number;
    maxParticipants: number;
    bookingCount?: number;
    seriesId?: string | null;
    seriesTitle?: string;
  };
};

interface CoursesToEventsOptions {
  mode: "admin" | "public";
  baseUrl?: string;
}

/**
 * Konvertiert Course-Objekte mit Sessions zu FullCalendar Events
 * Jede Session wird zu einem eigenen Event
 */
export function coursesToEvents(
  courses: CourseWithSeries[],
  options: CoursesToEventsOptions
): CalendarEvent[] {
  const { mode, baseUrl = "" } = options;
  const now = new Date();

  const events: CalendarEvent[] = [];

  courses
    .filter((course) => {
      // Public: Nur veröffentlichte Kurse
      if (mode === "public") {
        return course.status === "PUBLISHED";
      }
      // Admin: Alle Kurse
      return true;
    })
    .forEach((course) => {
      // Wenn Sessions vorhanden sind, erstelle für jede Session ein Event
      if (course.sessions && course.sessions.length > 0) {
        course.sessions.forEach((session) => {
          // Public: Nur zukünftige Sessions
          if (mode === "public" && new Date(session.startAt) < now) {
            return;
          }

          const start = new Date(session.startAt);
          const durationMinutes = session.durationMinutes || 60; // Fallback falls null
          const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

          // URL basierend auf Mode
          let url: string | undefined;
          if (mode === "admin") {
            url = `${baseUrl}/admin/courses/${course.id}`;
          } else {
            url = `${baseUrl}/kurse/${course.id}`;
          }

          // Titel mit Serie-Hinweis, falls vorhanden
          const eventTitle = course.series 
            ? `🌿 ${course.title}` 
            : course.title;

          events.push({
            id: `${course.id}-${session.id}`, // Eindeutige ID für Session-Event
            title: eventTitle,
            start: start.toISOString(),
            end: end.toISOString(),
            url,
            extendedProps: {
              courseId: course.id,
              sessionId: session.id,
              status: course.status,
              location: course.location,
              priceCents: course.priceCents,
              maxParticipants: course.maxParticipants,
              seriesId: course.seriesId,
              seriesTitle: course.series?.title,
            },
          });
        });
      } else {
        // Fallback: Wenn keine Sessions vorhanden sind (alte Kurse ohne Migration)
        // Versuche startAt aus Legacy-Daten zu lesen (nur für Backward Compatibility)
        // Neue Kurse sollten immer Sessions haben
        const start = (course as any).startAt ? new Date((course as any).startAt) : null;
        if (!start) {
          // Keine Session und kein Legacy startAt - überspringe diesen Kurs
          return;
        }

        // Public: Nur zukünftige Kurse
        if (mode === "public" && start < now) {
          return;
        }

        const end = new Date(start.getTime() + 60 * 60 * 1000); // Fallback: 60 Minuten wenn keine Session

        // URL basierend auf Mode
        let url: string | undefined;
        if (mode === "admin") {
          url = `${baseUrl}/admin/courses/${course.id}`;
        } else {
          url = `${baseUrl}/kurse/${course.id}`;
        }

        // Titel mit Serie-Hinweis, falls vorhanden
        const eventTitle = course.series 
          ? `🌿 ${course.title}` 
          : course.title;

        events.push({
          id: course.id,
          title: eventTitle,
          start: start.toISOString(),
          end: end.toISOString(),
          url,
          extendedProps: {
            courseId: course.id,
            status: course.status,
            location: course.location,
            priceCents: course.priceCents,
            maxParticipants: course.maxParticipants,
            seriesId: course.seriesId,
            seriesTitle: course.series?.title,
          },
        });
      }
    });

  return events;
}

