import { db } from "@/lib/db";
import { coursesToEvents } from "@/lib/calendar/course-events";
import PublicCourseCalendar from "@/components/calendar/public-course-calendar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kurskalender",
  description: "Übersicht aller verfügbaren Kurse im Kalender",
};

// Immer serverseitig frisch rendern, damit Kursänderungen aus dem Admin sofort
// im Kalender sichtbar sind.
export const dynamic = "force-dynamic";

export default async function PublicCalendarPage() {
  const now = new Date();

  // Lade nur veröffentlichte Kurse mit Sessions
  const courses = await db.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      sessions: {
        where: {
          startAt: {
            gte: now, // Nur zukünftige Sessions
          },
        },
        orderBy: {
          startAt: "asc",
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
      series: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Filtere Kurse ohne zukünftige Sessions
  const coursesWithFutureSessions = courses.filter((course) => course.sessions.length > 0);

  // Konvertiere zu Calendar Events
  const baseUrl = process.env.APP_BASE_URL || "";
  const events = coursesToEvents(coursesWithFutureSessions, {
    mode: "public",
    baseUrl,
  });

  // Füge Booking-Count zu extendedProps hinzu
  const eventsWithBookings = events.map((event) => {
    // extendedProps ist immer vorhanden, da coursesToEvents es immer setzt
    if (!event.extendedProps) {
      throw new Error(`Event ${event.id} hat keine extendedProps`);
    }
    const course = coursesWithFutureSessions.find((c) => c.id === event.extendedProps?.courseId);
    const bookingCount = course?._count.bookings || 0;
    const isFull = bookingCount >= (course?.maxParticipants || 0);

    return {
      ...event,
      extendedProps: {
        ...event.extendedProps,
        bookingCount,
        isFull,
      },
    };
  });

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kurskalender</h1>
          <p className="text-gray-600">
            Hier findest du eine Übersicht aller verfügbaren Kurse im Kalenderformat.
            Klicke auf einen Kurs, um mehr Details zu erfahren.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6">
          <PublicCourseCalendar initialEvents={eventsWithBookings} />
        </div>
      </div>
    </div>
  );
}

