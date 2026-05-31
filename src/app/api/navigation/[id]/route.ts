import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { navigationItemSchema } from "@/lib/validations/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/navigation/[id]
 * Aktualisiert ein Navigation Item
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
    const body = await request.json();
    const validatedData = navigationItemSchema.parse(body);

    const existing = await db.navigationItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Navigation Item nicht gefunden" },
        { status: 404 }
      );
    }

    const item = await db.navigationItem.update({
      where: { id },
      data: validatedData,
      include: {
        children: true,
      },
    });

    return NextResponse.json(item);
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
    console.error("Fehler beim Aktualisieren des Navigation Items:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/navigation/[id]
 * Löscht ein Navigation Item (und alle Kinder)
 */
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

    const existing = await db.navigationItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Navigation Item nicht gefunden" },
        { status: 404 }
      );
    }

    // Löscht automatisch alle Kinder durch onDelete: Cascade
    await db.navigationItem.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Löschen des Navigation Items:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

