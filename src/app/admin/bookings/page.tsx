import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import BookingsPageClient from "@/components/bookings/bookings-page-client";

export default async function BookingsPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  // Lade Kurse für Filter
  const courses = await db.course.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buchungen</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie alle Buchungen
          </p>
        </div>

        <BookingsPageClient courses={courses} />
      </div>
    </AdminContainer>
  );
}

