import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const updateReusableBlockSchema = z.object({
  name: z.string().min(1).optional(),
  contentJson: z.any().optional(),
});

// GET /api/reusable-blocks/[id] - Einzelnen Reusable Block abrufen
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
    const reusableBlock = await db.reusableBlock.findUnique({
      where: { id },
    });

    if (!reusableBlock) {
      return NextResponse.json(
        { error: "Reusable Block nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(reusableBlock);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching reusable block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/reusable-blocks/[id] - Reusable Block aktualisieren
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
    const body = await request.json();
    const validatedData = updateReusableBlockSchema.parse(body);

    const existing = await db.reusableBlock.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reusable Block nicht gefunden" },
        { status: 404 }
      );
    }

    const reusableBlock = await db.reusableBlock.update({
      where: { id },
      data: validatedData,
    });

    await logger.success(
      "ADMIN",
      "REUSABLE_BLOCK_UPDATED",
      `Reusable Block aktualisiert: ${reusableBlock.name}`,
      {
        reusableBlockId: reusableBlock.id,
        name: reusableBlock.name,
        updatedBy: session.user.id,
      }
    );

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "ReusableBlock",
        id: reusableBlock.id,
        label: reusableBlock.name,
      },
      action: AuditAction.UPDATE,
      message: `Reusable Block "${reusableBlock.name}" aktualisiert`,
      meta: {
        name: reusableBlock.name,
        changes: validatedData,
      },
    });

    return NextResponse.json(reusableBlock);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating reusable block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/reusable-blocks/[id] - Reusable Block löschen (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.reusableBlock.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reusable Block nicht gefunden" },
        { status: 404 }
      );
    }

    await db.reusableBlock.delete({
      where: { id },
    });

    await logger.success(
      "ADMIN",
      "REUSABLE_BLOCK_DELETED",
      `Reusable Block gelöscht: ${existing.name}`,
      {
        reusableBlockId: id,
        name: existing.name,
        deletedBy: session.user.id,
      }
    );

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "ReusableBlock",
        id,
        label: existing.name,
      },
      action: AuditAction.DELETE,
      message: `Reusable Block "${existing.name}" gelöscht`,
      meta: {
        name: existing.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error deleting reusable block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



