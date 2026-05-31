import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminCalendar from "@/components/calendar/admin-calendar";
import { coursesToEvents } from "@/lib/calendar/course-events";

export default async function AdminCalendarPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  // Lade alle Kurse mit Sessions
  const courses = await db.course.findMany({
    include: {
      sessions: {
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

  // Konvertiere zu Calendar Events
  const baseUrl = process.env.APP_BASE_URL || "";
  const events = coursesToEvents(courses, {
    mode: "admin",
    baseUrl,
  });

  // Füge Booking-Count zu extendedProps hinzu
  const eventsWithBookings = events.map((event) => {
    const course = courses.find((c) => c.id === event.id);
    // extendedProps ist immer vorhanden, da coursesToEvents es immer setzt
    if (!event.extendedProps) {
      throw new Error(`Event ${event.id} hat keine extendedProps`);
    }
    return {
      ...event,
      extendedProps: {
        ...event.extendedProps,
        bookingCount: course?._count.bookings || 0,
      },
    };
  });

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
            <p className="text-sm text-gray-500 mt-1">
              Übersicht aller Kurse im Kalender
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <AdminCalendar initialEvents={eventsWithBookings} />
        </div>
      </div>
    </AdminContainer>
  );
}

