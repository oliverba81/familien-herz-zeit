import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import SignForm from "@/components/signs/admin/sign-form";

export default async function NewSignPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Neues Zeichen erstellen</h1>
        <SignForm mode="create" />
      </div>
    </AdminContainer>
  );
}



