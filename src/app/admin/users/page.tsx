import { requireRoleOrRedirect } from "@/lib/auth/guards";
import AdminContainer from "@/components/admin/admin-container";
import UsersAdmin from "@/components/admin/users/users-admin";

export default async function UsersPage() {
  await requireRoleOrRedirect(["ADMIN"]);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benutzer-Verwaltung</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Benutzer und deren Rollen
          </p>
        </div>

        <UsersAdmin />
      </div>
    </AdminContainer>
  );
}





