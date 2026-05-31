import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import AdminCookieScanner from "@/components/cookies/admin-cookie-scanner";

export default async function CookiesAdminPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cookie-Verwaltung</h1>
          <p className="text-gray-600 mt-1">
            Scanne Cookies der Website und pflege den Cookie-Katalog für den Banner.
          </p>
        </div>
        <AdminCookieScanner />
      </div>
    </AdminContainer>
  );
}
