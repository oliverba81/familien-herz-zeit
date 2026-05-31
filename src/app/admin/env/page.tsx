import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import EnvForm from "@/components/admin/env-form";

export default async function EnvPage() {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environment-Variablen</h1>
          <p className="text-gray-600 mt-1">
            Verwalte API-Keys und Konfigurationen (nur für Administratoren)
          </p>
        </div>
        <EnvForm />
      </div>
    </AdminContainer>
  );
}

