import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import EmailTemplatesForm from "@/components/admin/email-templates-form";

export default async function EmailTemplatesPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Mail-Vorlagen</h1>
          <p className="text-gray-600 mt-1">
            Bearbeite die E-Mail-Vorlagen für verschiedene Vorgänge im System
          </p>
        </div>
        <EmailTemplatesForm />
      </div>
    </AdminContainer>
  );
}

