import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import CourseForm from "@/components/courses/course-form";
import { parseIsoFromQuery, toDateTimeLocal } from "@/lib/utils/iso";

interface NewCoursePageProps {
  searchParams: Promise<{ startAt?: string }>;
}

export default async function NewCoursePage({ searchParams }: NewCoursePageProps) {
  await requireRole(["ADMIN", "EDITOR"]);

  const params = await searchParams;
  const startAtParam = parseIsoFromQuery(params.startAt);
  
  // Konvertiere zu datetime-local Format für Prefill
  const prefilledStartAt = startAtParam ? toDateTimeLocal(startAtParam) : undefined;

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuer Kurs</h1>
          <p className="text-gray-600 mt-1">
            Erstelle einen neuen Präsenz-Kurs
            {prefilledStartAt && (
              <span className="text-rose-500"> (Datum vorausgefüllt)</span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CourseForm mode="create" prefilledStartAt={prefilledStartAt} />
        </div>
      </div>
    </AdminContainer>
  );
}

