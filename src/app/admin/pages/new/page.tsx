import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import PageForm from "@/components/pages/page-form";

interface NewPagePageProps {
  searchParams: Promise<{ slug?: string; title?: string }>;
}

export default async function NewPagePage({ searchParams }: NewPagePageProps) {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const initialSlug = params.slug || "";
  const initialTitle = params.title || "";

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {initialSlug === "home" ? "Startseite erstellen" : "Neue Seite erstellen"}
        </h1>
        {initialSlug === "home" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Hinweis:</strong> Diese Seite wird als Startseite (/) angezeigt. 
              Der Slug wird automatisch auf "home" gesetzt.
            </p>
          </div>
        )}
        <PageForm 
          mode="create" 
          initialData={initialTitle || initialSlug ? {
            title: initialTitle,
            slug: initialSlug,
            published: false,
            contentJson: null,
          } : undefined}
        />
      </div>
    </AdminContainer>
  );
}

