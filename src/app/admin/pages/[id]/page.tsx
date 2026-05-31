import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import PageFormClient from "./page-form-client";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage({ params }: PageProps) {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const page = await db.page.findUnique({
    where: { id },
  });

  if (!page) {
    notFound();
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Seite bearbeiten</h1>
          {page.published ? (
            <Link
              href={`/${page.slug}`}
              target="_blank"
              className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
            >
              Öffnen →
            </Link>
          ) : (
            <span className="text-sm text-gray-500">Nicht veröffentlicht</span>
          )}
        </div>
        <PageFormClient initialData={page} />
      </div>
    </AdminContainer>
  );
}


