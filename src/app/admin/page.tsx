import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import UserInfo from "@/components/admin/user-info";
import AdminDashboard from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <UserInfo email={session.user?.email || ""} role={session.user?.role || ""} />
      <div className="mt-6">
        <AdminDashboard />
      </div>
    </AdminContainer>
  );
}

