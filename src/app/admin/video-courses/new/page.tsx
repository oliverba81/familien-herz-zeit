import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import VideoCourseForm from "@/components/video-courses/video-course-form";

export default async function NewVideoCoursePage() {
  await requireRole(["ADMIN", "EDITOR"]);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuer Videokurs</h1>
          <p className="text-gray-600 mt-1">
            Erstelle einen neuen Videokurs
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <VideoCourseForm mode="create" />
        </div>
      </div>
    </AdminContainer>
  );
}

