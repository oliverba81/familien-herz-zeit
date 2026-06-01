import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/feedback/responses/:responseId  (Admin/Editor)
 * Einzelne Antwort löschen (DSGVO-Löschrecht).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { responseId } = await params;
    const existing = await db.feedbackResponse.findUnique({
      where: { id: responseId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Antwort nicht gefunden" },
        { status: 404 }
      );
    }

    await db.feedbackResponse.delete({ where: { id: responseId } });

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: { type: "FeedbackResponse", id: responseId, label: existing.formId },
      action: AuditAction.DELETE,
      message: `Einzelne Feedback-Antwort gelöscht`,
      meta: { formId: existing.formId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Löschen der Antwort:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
