import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import FeedbackFormBuilder from "@/components/feedback/feedback-form-builder";

export const dynamic = "force-dynamic";

export default async function NewFeedbackPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Neuer Feedbackbogen
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <FeedbackFormBuilder mode="create" />
        </div>
      </div>
    </AdminContainer>
  );
}
