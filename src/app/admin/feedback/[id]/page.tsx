import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import FeedbackFormBuilder from "@/components/feedback/feedback-form-builder";
import FeedbackShareLink from "@/components/feedback/feedback-share-link";
import { parseQuestions } from "@/lib/feedback/types";

export const dynamic = "force-dynamic";

export default async function EditFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const form = await db.feedbackForm.findUnique({ where: { id } });
  if (!form) {
    notFound();
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Feedbackbogen bearbeiten
        </h1>

        {form.status === "PUBLISHED" ? (
          <FeedbackShareLink shareToken={form.shareToken} />
        ) : (
          <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            Dieser Bogen ist ein Entwurf und noch nicht öffentlich erreichbar.
            Setze den Status auf „Veröffentlicht“, um den Link zu teilen.
          </p>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <FeedbackFormBuilder
            mode="edit"
            initialData={{
              id: form.id,
              title: form.title,
              description: form.description,
              status: form.status,
              collectName: form.collectName,
              collectEmail: form.collectEmail,
              questions: parseQuestions(form.questions),
            }}
          />
        </div>
      </div>
    </AdminContainer>
  );
}
