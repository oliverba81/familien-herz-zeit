import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import Link from "next/link";
import { formatBerlinDateTime } from "@/lib/utils/datetime";
import { formatCents } from "@/lib/utils/money";

export default async function CoursesPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  const courses = await db.course.findMany({
    include: {
      sessions: {
        orderBy: {
          startAt: "asc",
        },
        take: 1, // Nur ersten Termin für Sortierung
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Veröffentlicht
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Abgesagt
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Entwurf
          </span>
        );
    }
  };

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live-Kurse</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Ihre Live-Kurse
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/kurse"
              target="_blank"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Übersichtsseite öffnen →
            </Link>
            <Link
              href="/admin/courses/new"
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              Neuer Kurs
            </Link>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
            <p>Noch keine Kurse vorhanden.</p>
            <Link
              href="/admin/courses/new"
              className="mt-4 inline-block text-rose-500 hover:text-rose-600"
            >
              Ersten Kurs erstellen
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Zeit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plätze
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preis
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => {
                  const bookingCount = course._count.bookings;
                  const isFull = bookingCount >= course.maxParticipants;
                  const firstSession = course.sessions[0];
                  const sessionCount = course.sessions.length;
                  
                  return (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {course.title}
                        </div>
                        {sessionCount > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {sessionCount} Termine
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {firstSession ? (
                          <>
                            <div className="text-sm text-gray-500">
                              {formatBerlinDateTime(firstSession.startAt)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {firstSession.durationMinutes || 60} Min
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            Keine Termine
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {course.location || (
                            <span className="text-gray-400 italic">Kein Ort angegeben</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(course.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isFull ? "text-red-600 font-semibold" : "text-gray-900"}`}>
                          {bookingCount} / {course.maxParticipants}
                        </div>
                        {isFull && (
                          <div className="text-xs text-red-500">Ausgebucht</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCents(course.priceCents)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-3 justify-end">
                          <Link
                            href={`/admin/courses/${course.id}/view`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ansehen
                          </Link>
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="text-rose-600 hover:text-rose-900"
                          >
                            Bearbeiten
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}

