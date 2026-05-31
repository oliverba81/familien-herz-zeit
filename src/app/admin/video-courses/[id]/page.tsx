import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import VideoCourseForm from "@/components/video-courses/video-course-form";
import Link from "next/link";

export default async function EditVideoCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "EDITOR"]);

  const { id } = await params;
  const course = await db.videoCourse.findUnique({
    where: { id },
  });

  if (!course) {
    notFound();
  }

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Videokurs bearbeiten</h1>
            <p className="text-gray-600 mt-1">
              {course.title}
            </p>
          </div>
          <Link
            href="/videokurse"
            target="_blank"
            className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
          >
            Übersichtsseite öffnen →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <VideoCourseForm
            mode="edit"
            initialData={{
              id: course.id,
              title: course.title,
              slug: course.slug,
              description: course.description,
              priceCents: course.priceCents,
              durationMinutes: course.durationSeconds ? Math.round(course.durationSeconds / 60) : 0,
              status: course.status,
              videoUrl: course.videoUrl,
              thumbnailUrl: course.thumbnailUrl,
            }}
          />
        </div>
      </div>
    </AdminContainer>
  );
}

