import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import CourseViewParticipants from "@/components/courses/course-view-participants";
import Link from "next/link";
import { formatCents } from "@/lib/utils/money";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

export default async function CourseViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "EDITOR"]);

  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
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
          waitlistEntries: true,
        },
      },
      series: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const bookingCount = course._count.bookings;
  const confirmedCount = await db.booking.count({
    where: {
      courseId: course.id,
      status: "CONFIRMED",
    },
  });
  const pendingCount = await db.booking.count({
    where: {
      courseId: course.id,
      status: "PENDING",
    },
  });
  const availableSpots = course.maxParticipants - bookingCount;
  const firstSession = course.sessions[0];
  const waitlistCount = course._count.waitlistEntries;

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kurs ansehen</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/admin/courses/${course.id}`}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
            >
              Bearbeiten
            </Link>
            <Link
              href="/admin/courses"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>

        {/* Kurs-Informationen */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kurs-Informationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Titel</label>
              <p className="text-base text-gray-900">{course.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span
                className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                  course.status === "PUBLISHED"
                    ? "bg-green-100 text-green-800"
                    : course.status === "CANCELLED"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {course.status === "PUBLISHED"
                  ? "Veröffentlicht"
                  : course.status === "CANCELLED"
                  ? "Abgesagt"
                  : "Entwurf"}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Preis</label>
              <p className="text-base text-gray-900">
                {course.priceCents === 0 ? "Kostenlos" : formatCents(course.priceCents)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Max. Teilnehmer</label>
              <p className="text-base text-gray-900">{course.maxParticipants}</p>
            </div>
            {course.location && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Ort</label>
                <p className="text-base text-gray-900">{course.location}</p>
              </div>
            )}
            {firstSession && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Erster Termin</label>
                <p className="text-base text-gray-900">
                  {formatBerlinDateTime(firstSession.startAt)}
                </p>
              </div>
            )}
            {course.series && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Serie</label>
                <p className="text-base text-gray-900">{course.series.title}</p>
              </div>
            )}
          </div>
          {course.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">Beschreibung</label>
              <p className="text-base text-gray-700 whitespace-pre-line">{course.description}</p>
            </div>
          )}
        </div>

        {/* Statistiken */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiken</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Gesamt Buchungen</div>
              <div className="text-2xl font-bold text-gray-900">{bookingCount}</div>
              <div className="text-xs text-gray-500 mt-1">(PENDING + CONFIRMED)</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Ausstehend</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Bestätigt</div>
              <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Freie Plätze</div>
              <div className={`text-2xl font-bold ${availableSpots <= 0 ? "text-red-600" : "text-blue-600"}`}>
                {availableSpots}
              </div>
              <div className="text-xs text-gray-500 mt-1">von {course.maxParticipants}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Warteliste</div>
              <div className="text-2xl font-bold text-purple-700">
                {waitlistCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Interessenten ohne feste Buchung
              </div>
            </div>
          </div>
        </div>

        {/* Teilnehmer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Angemeldete Teilnehmer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Übersicht aller angemeldeten und bestätigten Teilnehmer (stornierte Buchungen werden nicht angezeigt)
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/waitlist?courseId=${course.id}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Warteliste ansehen{waitlistCount > 0 ? ` (${waitlistCount})` : ""}
              </Link>
              <Link
                href={`/api/admin/bookings/export?courseId=${course.id}`}
                target="_blank"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                CSV Export
              </Link>
            </div>
          </div>

          <CourseViewParticipants courseId={course.id} />
        </div>
      </div>
    </AdminContainer>
  );
}

