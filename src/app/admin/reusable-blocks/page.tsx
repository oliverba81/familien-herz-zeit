import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import ReusableBlocksManager from "@/components/admin/reusable-blocks-manager";

export const dynamic = "force-dynamic";

export default async function ReusableBlocksPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Globale Blöcke</h1>
        <ReusableBlocksManager />
      </div>
    </AdminContainer>
  );
}
