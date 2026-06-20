import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import WaitlistForm from "@/components/waitlist/waitlist-form";

export default async function NewWaitlistEntryPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  const courses = await db.course.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuer Wartelisten-Eintrag</h1>
          <p className="text-gray-600 mt-1">
            Trage Interessenten manuell ein und ordne optional einen Kurs zu.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <WaitlistForm mode="create" courses={courses} />
        </div>
      </div>
    </AdminContainer>
  );
}

