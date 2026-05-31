import { requireRoleOrRedirect } from "@/lib/auth/guards";
import AdminContainer from "@/components/admin/admin-container";
import DiscountsAdmin from "@/components/admin/discounts/discounts-admin";

export default async function DiscountsPage() {
  await requireRoleOrRedirect(["ADMIN"]);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Rabattcodes</h1>
        <DiscountsAdmin />
      </div>
    </AdminContainer>
  );
}



