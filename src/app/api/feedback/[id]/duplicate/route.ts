import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction, Prisma } from "@prisma/client";
import { generateToken } from "@/lib/utils/token";
import { parseQuestions, FeedbackQuestion } from "@/lib/feedback/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Klont Fragen mit frischen IDs (Frage + Optionen). */
function cloneQuestions(questions: FeedbackQuestion[]): FeedbackQuestion[] {
  return questions.map((q) => {
    const base = { ...q, id: randomUUID() };
    if (base.type === "SINGLE_CHOICE" || base.type === "MULTI_CHOICE") {
      return {
        ...base,
        options: base.options.map((o) => ({ ...o, id: randomUUID() })),
      };
    }
    return base;
  });
}

/**
 * POST /api/feedback/:id/duplicate  (Admin/Editor)
 * Kopie als DRAFT mit neuem shareToken und neuen Fragen-/Options-IDs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const source = await db.feedbackForm.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json(
        { error: "Feedbackbogen nicht gefunden" },
        { status: 404 }
      );
    }

    const clonedQuestions = cloneQuestions(parseQuestions(source.questions));

    const form = await db.feedbackForm.create({
      data: {
        title: `${source.title} (Kopie)`,
        description: source.description,
        status: "DRAFT",
        collectName: source.collectName,
        collectEmail: source.collectEmail,
        shareToken: generateToken(32),
        questions: clonedQuestions as unknown as Prisma.InputJsonValue,
      },
    });

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: { type: "FeedbackForm", id: form.id, label: form.title },
      action: AuditAction.CREATE,
      message: `Feedbackbogen "${form.title}" als Kopie erstellt`,
      meta: { sourceFormId: source.id },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Kopieren des Feedbackbogens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
