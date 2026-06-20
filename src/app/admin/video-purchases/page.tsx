import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import VideoPurchaseConfirmButton from "@/components/admin/video-purchase-confirm-button";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/utils/money";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export default async function VideoPurchasesPage() {
  const session = await requireRole(["ADMIN"]);
  if (!session) {
    redirect("/admin/login");
  }

  // Alle Überweisungs-Käufe, offene zuerst
  const purchases = await db.videoPurchase.findMany({
    where: { provider: "BANKTRANSFER" },
    include: { videoCourse: { select: { title: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = purchases.filter((p) => p.status === "PENDING").length;

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Videokäufe – Überweisungen
          </h1>
          <p className="text-gray-600 mt-1">
            Offene Überweisungen für Videokurse. Nach Zahlungseingang hier
            bestätigen – der Zugang wird dann automatisch freigeschaltet (E-Mail
            an den Kunden).
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Keine Überweisungs-Käufe vorhanden.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs</th>
                  <th className="text-left px-4 py-3 font-medium">E-Mail</th>
                  <th className="text-right px-4 py-3 font-medium">Betrag</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatBerlinDateTime(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {p.videoCourse.title}
                      <div className="text-xs text-gray-400 font-mono">{p.id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.email}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCents(p.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "PAID" ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Bezahlt
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Offen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "PENDING" ? (
                        <VideoPurchaseConfirmButton purchaseId={p.id} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pendingCount > 0 && (
          <p className="text-sm text-gray-500">
            {pendingCount} offene Überweisung{pendingCount === 1 ? "" : "en"}.
          </p>
        )}
      </div>
    </AdminContainer>
  );
}
