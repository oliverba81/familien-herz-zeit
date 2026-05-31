import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageMedia, canDeleteMedia } from "@/lib/auth/policies";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/[id]
 * Gibt ein Medium nach ID zurück (auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRoleOrThrow(["ADMIN", "EDITOR"]);
    
    if (!canManageMedia(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const media = await db.media.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json(
        { error: "Medium nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(media);
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen des Mediums:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id]
 * Löscht ein Medium (auth required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRoleOrThrow(["ADMIN"]);
    
    if (!canDeleteMedia(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Prüfe ob Medium existiert
    const media = await db.media.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json(
        { error: "Medium nicht gefunden" },
        { status: 404 }
      );
    }

    // Audit Log (vor dem Löschen)
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Media",
        id: media.id,
        label: media.fileName,
      },
      action: AuditAction.DELETE,
      message: `Medium "${media.fileName}" gelöscht`,
      meta: {
        type: media.type,
      },
    });

    // Lösche Medium aus Datenbank
    await db.media.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Löschen des Mediums:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

