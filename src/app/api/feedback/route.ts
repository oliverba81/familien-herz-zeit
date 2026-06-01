import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { feedbackFormSchema } from "@/lib/validations/feedback";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction, Prisma } from "@prisma/client";
import { generateToken } from "@/lib/utils/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/feedback
 * Liste aller Feedbackbögen (Admin/Editor) inkl. Antwort-Anzahl.
 */
export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await db.feedbackForm.findMany({
      include: {
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(forms);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Feedbackbögen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback
 * Erstellt einen neuen Feedbackbogen.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = feedbackFormSchema.parse(body);

    const form = await db.feedbackForm.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        collectName: data.collectName,
        collectEmail: data.collectEmail,
        shareToken: generateToken(32),
        questions: data.questions as unknown as Prisma.InputJsonValue,
      },
    });

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: { type: "FeedbackForm", id: form.id, label: form.title },
      action: AuditAction.CREATE,
      message: `Feedbackbogen "${form.title}" erstellt`,
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Erstellen des Feedbackbogens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
