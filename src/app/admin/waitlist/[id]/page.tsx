import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import WaitlistForm from "@/components/waitlist/waitlist-form";

interface EditWaitlistEntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWaitlistEntryPage({
  params,
}: EditWaitlistEntryPageProps) {
  await requireRole(["ADMIN", "EDITOR"]);

  const { id } = await params;

  const [entry, courses] = await Promise.all([
    db.waitlistEntry.findUnique({
      where: { id },
    }),
    db.course.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  if (!entry) {
    notFound();
  }

  const initialData = {
    id: entry.id,
    courseId: entry.courseId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    email: entry.email,
    phone: entry.phone,
    childFirstName: entry.childFirstName,
    childLastName: entry.childLastName,
    childBirthDate: entry.childBirthDate,
    childNotes: entry.childNotes,
    interestLabel: entry.interestLabel,
    notes: entry.notes,
  };

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wartelisten-Eintrag bearbeiten</h1>
          <p className="text-gray-600 mt-1">
            Bearbeite die Kontaktdaten und Kurszuordnung des Interessenten.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <WaitlistForm mode="edit" courses={courses} initialData={initialData} />
        </div>
      </div>
    </AdminContainer>
  );
}

