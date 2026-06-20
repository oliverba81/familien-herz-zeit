import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import CourseSeriesForm from "@/components/courses/course-series-form";

export default async function NewCourseSeriesPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neue Terminserie</h1>
          <p className="text-gray-600 mt-1">
            Erstelle eine neue Serie wiederkehrender Kurstermine
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CourseSeriesForm mode="create" />
        </div>
      </div>
    </AdminContainer>
  );
}

