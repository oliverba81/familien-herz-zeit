import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import PaymentSettingsForm from "@/components/admin/payment-settings-form";

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zahlungseinstellungen</h1>
          <p className="text-gray-600 mt-1">
            Zahlungsarten aktivieren/deaktivieren und konfigurieren (Stripe, PayPal,
            Überweisung). API-Keys werden in der Datenbank gespeichert; Änderungen
            wirken sofort.
          </p>
        </div>
        <PaymentSettingsForm />
      </div>
    </AdminContainer>
  );
}
