import { db } from "@/lib/db";

/** Eine Session in serialisierbarer Form (Date → ISO-String). */
export interface SerializableSession {
  /** ISO-8601 (UTC). Die datetime-Utils akzeptieren diesen String direkt. */
  startAt: string;
  durationMinutes: number;
}

/**
 * Veröffentlichter Kurs in rein serialisierbarer Form (keine Date-Objekte),
 * damit er von Server-Komponenten an Client-Views und über die API an den
 * WYSIWYG-Builder weitergereicht werden kann.
 */
export interface SerializableCourse {
  id: string;
  title: string;
  /** "AUTO" | "COURSE" | "TOPIC" – steuert die Aufteilung mehrwöchig/Themenstunde. */
  category: string;
  maxParticipants: number;
  plannedMonth: number | null;
  plannedYear: number | null;
  location: string | null;
  /** Aufsteigend nach startAt sortiert; ggf. leer. */
  sessions: SerializableSession[];
  /** Anzahl PENDING + CONFIRMED Buchungen. */
  bookingCount: number;
}

/**
 * Lädt alle veröffentlichten Kurse inkl. Sessions und Buchungszähler und gibt
 * sie in serialisierbarer Form zurück. Gemeinsame Datenquelle für
 * `CoursesBlock` / `CurrentAppointmentsBlock` (Server) sowie die Editor-Live-API.
 */
export async function getPublishedCoursesSerializable(): Promise<SerializableCourse[]> {
  const courses = await db.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      sessions: {
        orderBy: {
          startAt: "asc",
        },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category,
    maxParticipants: course.maxParticipants,
    plannedMonth: course.plannedMonth,
    plannedYear: course.plannedYear,
    location: course.location,
    sessions: course.sessions.map((s) => ({
      startAt: s.startAt.toISOString(),
      durationMinutes: s.durationMinutes,
    })),
    bookingCount: course._count.bookings,
  }));
}
