import { db } from "@/lib/db";
import Link from "next/link";
import { formatBerlinDateTime, formatBerlinDate, formatBerlinTime } from "@/lib/utils/datetime";
import { formatCents } from "@/lib/utils/money";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live-Kurse",
  description: "Entdecken Sie unsere Live-Kurse",
};

// Immer serverseitig frisch rendern, damit Kursänderungen aus dem Admin sofort
// sichtbar sind (freie Plätze, Termine und Buchungszahlen sind dynamisch).
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const now = new Date();
  
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
        take: 1, // Nur ersten Termin für Übersicht
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

  // Filtere Kurse ohne zukünftige Sessions
  const coursesWithFutureSessions = courses.filter((course) => course.sessions.length > 0);

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Live-Kurse</h1>
              <p className="text-lg text-gray-600">
                Entdecken Sie unsere Auswahl an Live-Kursen
              </p>
            </div>
            <Link
              href="/kurse/kalender"
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors whitespace-nowrap"
            >
              📆 Kalender-Ansicht
            </Link>
          </div>
        </div>

        {coursesWithFutureSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Derzeit sind keine Kurse verfügbar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesWithFutureSessions.map((course) => {
              const bookingCount = course._count.bookings;
              const availableSpots = course.maxParticipants - bookingCount;
              const isFull = availableSpots <= 0;
              const firstSession = course.sessions[0];
              const sessionDuration = firstSession.durationMinutes || 60;

              return (
                <Link
                  key={course.id}
                  href={`/kurse/${course.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-rose-500 mb-1">
                        {formatBerlinDate(firstSession.startAt)} um {formatBerlinTime(firstSession.startAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sessionDuration} Minuten
                        {course.sessions.length > 1 && (
                          <span className="ml-2">• {course.sessions.length} Termine</span>
                        )}
                      </div>
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {course.title}
                    </h2>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {course.description.length > 120
                        ? `${course.description.substring(0, 120)}...`
                        : course.description}
                    </p>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-rose-500">
                        {formatCents(course.priceCents)}
                      </span>
                      {isFull ? (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Ausgebucht
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {availableSpots} {availableSpots === 1 ? "Platz" : "Plätze"} frei
                        </span>
                      )}
                    </div>

                    {course.location && (
                      <div className="text-xs text-gray-500 mb-4">
                        📍 {course.location}
                      </div>
                    )}

                    <div className="mt-4">
                      <span className="inline-block w-full text-center px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
                        Details & buchen
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

