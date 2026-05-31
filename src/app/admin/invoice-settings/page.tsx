import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import InvoiceSettingsForm from "@/components/admin/invoice-settings-form";
import { db } from "@/lib/db";

export default async function InvoiceSettingsPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  // Lade aktuelle Einstellungen
  let settings = await db.invoiceSettings.findFirst();

  if (!settings) {
    // Erstelle Standard-Einstellungen
      settings = await db.invoiceSettings.create({
        data: {
          companyName: "Familien Herz Zeit",
          companyAddress: "",
          companyCity: "",
          companyZip: "",
          companyCountry: "Deutschland",
          taxRate: 19.0,
          invoiceNumberPrefix: "RE",
          invoiceNumberSuffix: null,
          invoiceNumberStart: 1,
          isSmallBusiness: false,
        },
      });
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rechnungseinstellungen</h1>
          <p className="text-gray-600 mt-1">
            Konfigurieren Sie die Rechnungsdaten für automatisch generierte Rechnungen
          </p>
        </div>
        <InvoiceSettingsForm initialSettings={settings} />
      </div>
    </AdminContainer>
  );
}

