import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import UpdatePanel from "@/components/admin/updates/update-panel";

export default async function UpdatesPage() {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Updates</h1>
          <p className="text-gray-600 mt-1">
            Prüfe auf neue Versionen von GitHub und spiele Updates per Knopfdruck
            ein (nur für Administratoren).
          </p>
        </div>
        <UpdatePanel />
      </div>
    </AdminContainer>
  );
}
