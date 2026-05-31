import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import WaitlistPageClient from "@/components/waitlist/waitlist-page-client";
import Link from "next/link";

interface WaitlistPageProps {
  searchParams: Promise<{
    courseId?: string;
    q?: string;
  }>;
}

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  await requireRole(["ADMIN", "EDITOR"]);

  const params = await searchParams;

  const courses = await db.course.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const initialFilters = {
    courseId: params.courseId || undefined,
    q: params.q || undefined,
  };

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warteliste</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Interessenten, die noch keine feste Buchung haben.
            </p>
          </div>
          <Link
            href="/admin/waitlist/new"
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            Neuer Eintrag
          </Link>
        </div>

        <WaitlistPageClient courses={courses} initialFilters={initialFilters} />
      </div>
    </AdminContainer>
  );
}

