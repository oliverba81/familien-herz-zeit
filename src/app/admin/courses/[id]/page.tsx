import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import CourseForm from "@/components/courses/course-form";
import CourseSeriesInfo from "@/components/courses/course-series-info";
import CourseBookingsList from "@/components/bookings/course-bookings-list";
import Link from "next/link";
import { formatCents } from "@/lib/utils/money";

export default async function EditCoursePage({
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
  const availableSpots = course.maxParticipants - bookingCount;

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kurs bearbeiten</h1>
            <p className="text-gray-600 mt-1">
              {course.title}
            </p>
          </div>
          <Link
            href="/kurse"
            target="_blank"
            className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
          >
            Übersichtsseite öffnen →
          </Link>
        </div>

        {course.series && (
          <CourseSeriesInfo courseId={course.id} series={course.series} />
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CourseForm
            mode="edit"
            initialData={{
              id: course.id,
              title: course.title,
              description: course.description,
              priceCents: course.priceCents,
              maxParticipants: course.maxParticipants,
              location: course.location,
              acceptsAokVoucher: course.acceptsAokVoucher || false,
              status: course.status as "DRAFT" | "PUBLISHED" | "CANCELLED",
              category: (course.category || "AUTO") as "AUTO" | "COURSE" | "TOPIC",
              plannedMonth: course.plannedMonth,
              plannedYear: course.plannedYear,
              sessions: course.sessions.map((session) => ({
                startAt: session.startAt,
                durationMinutes: session.durationMinutes || 60,
              })),
            }}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Angemeldete Teilnehmer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Übersicht aller Buchungen und Anmeldungen für diesen Kurs
              </p>
            </div>
            <Link
              href={`/api/admin/bookings/export?courseId=${course.id}`}
              target="_blank"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
            >
              CSV Export
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Gesamt Buchungen</div>
              <div className="text-2xl font-bold text-gray-900">{bookingCount}</div>
              <div className="text-xs text-gray-500 mt-1">
                (PENDING + CONFIRMED)
              </div>
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
              <div className="text-xs text-gray-500 mt-1">
                von {course.maxParticipants}
              </div>
            </div>
          </div>

          <CourseBookingsList courseId={course.id} />
        </div>
      </div>
    </AdminContainer>
  );
}

