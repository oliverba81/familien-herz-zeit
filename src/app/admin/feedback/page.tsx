import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import Link from "next/link";
import Badge from "@/components/ui/badge";
import FeedbackRowActions from "@/components/feedback/feedback-row-actions";
import { parseQuestions } from "@/lib/feedback/types";

export const dynamic = "force-dynamic";

export default async function FeedbackListPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  const forms = await db.feedbackForm.findMany({
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Feedbackbögen</h1>
          <Link
            href="/admin/feedback/new"
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
          >
            Neuer Feedbackbogen
          </Link>
        </div>

        {forms.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-4">
              Noch keine Feedbackbögen vorhanden.
            </p>
            <Link
              href="/admin/feedback/new"
              className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Ersten Feedbackbogen erstellen
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fragen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Antworten
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forms.map((form) => {
                  const questionCount = parseQuestions(form.questions).length;
                  return (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/feedback/${form.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-rose-600 transition-colors"
                        >
                          {form.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {form.status === "PUBLISHED" ? (
                          <Badge variant="success">Veröffentlicht</Badge>
                        ) : (
                          <Badge variant="default">Entwurf</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {questionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {form._count.responses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white hover:bg-gray-50">
                        <FeedbackRowActions
                          formId={form.id}
                          shareToken={form.shareToken}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}
