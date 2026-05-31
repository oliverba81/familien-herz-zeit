import { db } from "@/lib/db";
import Link from "next/link";
import { formatCents } from "@/lib/utils/money";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Videokurse",
  description: "Entdecken Sie unsere Videokurse",
};

export default async function VideoCoursesPage() {
  const courses = await db.videoCourse.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Videokurse</h1>
          <p className="text-lg text-gray-600">
            Entdecken Sie unsere Auswahl an hochwertigen Videokursen
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Derzeit sind keine Videokurse verfügbar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/videokurse/${course.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {course.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-200 overflow-hidden">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Kein Thumbnail</span>
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {course.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description.length > 150
                      ? `${course.description.substring(0, 150)}...`
                      : course.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-rose-500">
                      {course.priceCents === 0 ? "Kostenlos" : formatCents(course.priceCents)}
                    </span>
                    {course.durationSeconds && course.durationSeconds > 0 && (
                      <span className="text-sm text-gray-500">
                        {Math.round(course.durationSeconds / 60)} Min
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

