import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { feedbackFormSchema } from "@/lib/validations/feedback";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/feedback/:id  (Admin/Editor)
 */
export async function GET(
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
    const form = await db.feedbackForm.findUnique({ where: { id } });

    if (!form) {
      return NextResponse.json(
        { error: "Feedbackbogen nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(form);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen des Feedbackbogens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/feedback/:id  (Admin/Editor) — Bearbeiten auch bei vorhandenen Antworten.
 */
export async function PUT(
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
    const existing = await db.feedbackForm.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Feedbackbogen nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = feedbackFormSchema.parse(body);

    const form = await db.feedbackForm.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        collectName: data.collectName,
        collectEmail: data.collectEmail,
        questions: data.questions as unknown as Prisma.InputJsonValue,
      },
    });

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: { type: "FeedbackForm", id: form.id, label: form.title },
      action: AuditAction.UPDATE,
      message: `Feedbackbogen "${form.title}" bearbeitet`,
    });

    return NextResponse.json(form);
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
    console.error("Fehler beim Bearbeiten des Feedbackbogens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback/:id  (Admin/Editor) — Cascade entfernt Antworten.
 */
export async function DELETE(
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
    const existing = await db.feedbackForm.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Feedbackbogen nicht gefunden" },
        { status: 404 }
      );
    }

    await db.feedbackForm.delete({ where: { id } });

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: { type: "FeedbackForm", id: existing.id, label: existing.title },
      action: AuditAction.DELETE,
      message: `Feedbackbogen "${existing.title}" gelöscht`,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Löschen des Feedbackbogens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
