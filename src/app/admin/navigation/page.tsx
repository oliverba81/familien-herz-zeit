import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import NavigationEditor from "@/components/navigation/navigation-editor";

export default async function NavigationPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation bearbeiten</h1>
          <p className="text-gray-600 mt-1">
            Verwalte die Menüeinträge für Header und Footer
          </p>
        </div>
        <NavigationEditor />
      </div>
    </AdminContainer>
  );
}

