import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";

// PageContentV1 oder einzelner Block — frei-form, aber zwingend ein Objekt
// (kein null/Primitive/undefined), damit kein ungültiger Inhalt gespeichert wird.
const createReusableBlockSchema = z.object({
  name: z.string().min(1),
  contentJson: z.record(z.string(), z.unknown()),
});

// GET /api/reusable-blocks - Liste aller Reusable Blocks
export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reusableBlocks = await db.reusableBlock.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(reusableBlocks);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching reusable blocks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/reusable-blocks - Neuen Reusable Block erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createReusableBlockSchema.parse(body);

    const reusableBlock = await db.reusableBlock.create({
      data: {
        name: validatedData.name,
        // Validiert als Objekt; Cast auf den Prisma-JSON-Eingabetyp.
        contentJson: validatedData.contentJson as Prisma.InputJsonValue,
      },
    });

    await logger.success(
      "ADMIN",
      "REUSABLE_BLOCK_CREATED",
      `Reusable Block erstellt: ${reusableBlock.name}`,
      {
        reusableBlockId: reusableBlock.id,
        name: reusableBlock.name,
        createdBy: session.user.id,
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
      action: AuditAction.CREATE,
      message: `Reusable Block "${reusableBlock.name}" erstellt`,
      meta: {
        name: reusableBlock.name,
      },
    });

    return NextResponse.json(reusableBlock, { status: 201 });
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
    console.error("Error creating reusable block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



