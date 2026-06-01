import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import FeedbackFillForm from "@/components/feedback/feedback-fill-form";
import { parseQuestions } from "@/lib/feedback/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const form = await db.feedbackForm.findUnique({
    where: { shareToken: token },
  });

  if (!form || form.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <FeedbackFillForm
          shareToken={form.shareToken}
          title={form.title}
          description={form.description}
          collectName={form.collectName}
          collectEmail={form.collectEmail}
          questions={parseQuestions(form.questions)}
        />
      </div>
    </main>
  );
}
