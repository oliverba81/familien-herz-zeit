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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Seite bearbeiten</h1>
            {page.slug === "home" && (
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded font-semibold">
                Startseite
              </span>
            )}
          </div>
          {page.published ? (
            <Link
              href={page.slug === "home" ? "/" : `/${page.slug}`}
              target="_blank"
              className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
            >
              Öffnen →
            </Link>
          ) : (
            <span className="text-sm text-gray-500">Nicht veröffentlicht</span>
          )}
        </div>
        {page.slug === "home" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Hinweis:</strong> Diese Seite wird als Startseite (/) angezeigt.
            </p>
          </div>
        )}
        <PageFormClient 
          initialData={{
            ...page,
            containerWidth: page.containerWidth ?? undefined,
          }} 
        />
      </div>
    </AdminContainer>
  );
}

