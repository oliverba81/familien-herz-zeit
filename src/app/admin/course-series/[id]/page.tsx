import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import CourseSeriesForm from "@/components/courses/course-series-form";
import CourseSeriesBatchUpdate from "@/components/courses/course-series-batch-update";
import Link from "next/link";
import { formatBerlinDate } from "@/lib/utils/datetime";

export default async function EditCourseSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "EDITOR"]);

  const { id } = await params;
  const series = await db.courseSeries.findUnique({
    where: { id },
    include: {
      courses: {
        include: {
          sessions: {
            orderBy: {
              startAt: "asc",
            },
            take: 1, // Nur die erste Session für die Anzeige
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10, // Zeige nur die ersten 10 Termine
      },
      _count: {
        select: {
          courses: true,
        },
      },
    },
  });

  if (!series) {
    notFound();
  }

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Serie bearbeiten</h1>
            <p className="text-gray-600 mt-1">
              {series.title}
            </p>
          </div>
          <Link
            href="/admin/course-series"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Zurück zur Übersicht
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CourseSeriesForm mode="edit" initialData={series} />
        </div>

        {/* Batch Update */}
        <CourseSeriesBatchUpdate seriesId={series.id} />

        {/* Termine dieser Serie */}
        {series._count.courses > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Termine dieser Serie ({series._count.courses} insgesamt)
              </h2>
            </div>
            <div className="space-y-2">
              {series.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{course.title}</div>
                      <div className="text-sm text-gray-500">
                        {course.sessions && course.sessions.length > 0
                          ? formatBerlinDate(course.sessions[0].startAt)
                          : "Kein Termin"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {course.status === "PUBLISHED" ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Veröffentlicht
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {course.status}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {series._count.courses > 10 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  ... und {series._count.courses - 10} weitere Termine
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}

