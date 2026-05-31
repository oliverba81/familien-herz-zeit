import { requireRoleOrRedirect } from "@/lib/auth/guards";
import AdminContainer from "@/components/admin/admin-container";
import ActivityLog from "@/components/admin/activity/activity-log";

export default async function ActivityPage() {
  await requireRoleOrRedirect(["ADMIN"]);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aktivitäten</h1>
          <p className="text-gray-600 mt-1">
            Änderungsprotokoll aller Aktionen im Admin-Bereich
          </p>
        </div>

        <ActivityLog />
      </div>
    </AdminContainer>
  );
}





