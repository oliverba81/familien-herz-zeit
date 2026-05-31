import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import SettingsForm from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  // Lade aktuelle Settings
  const settings = await db.siteSettings.findMany();
  const settingsObj: Record<string, string | null> = {};
  settings.forEach((setting) => {
    settingsObj[setting.key] = setting.value;
  });

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website-Einstellungen</h1>
          <p className="text-gray-600 mt-1">
            Verwalte Logo, Seitennamen und andere Einstellungen
          </p>
        </div>
        <SettingsForm initialSettings={settingsObj} />
      </div>
    </AdminContainer>
  );
}

