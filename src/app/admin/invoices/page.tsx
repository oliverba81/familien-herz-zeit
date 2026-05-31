import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import InvoicesTable from "@/components/admin/invoices-table";

export default async function InvoicesPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  // Lade alle Rechnungen
  const invoices = await db.invoice.findMany({
    include: {
      purchase: {
        include: {
          videoCourse: {
            select: {
              title: true,
              slug: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
            <p className="text-gray-600 mt-1">
              Übersicht aller generierten Rechnungen
            </p>
          </div>
          <a
            href="/api/admin/invoices/test"
            target="_blank"
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            Testrechnung erstellen
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <InvoicesTable invoices={invoices} />
        </div>
      </div>
    </AdminContainer>
  );
}

