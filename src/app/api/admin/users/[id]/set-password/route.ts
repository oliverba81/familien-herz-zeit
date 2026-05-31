import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageUsers } from "@/lib/auth/policies";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logging/logger";
import { UserRole } from "@prisma/client";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const setPasswordSchema = z.object({
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

/**
 * POST /api/admin/users/[id]/set-password
 * Setzt das Passwort eines Users (ADMIN only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRoleOrThrow(["ADMIN"]);

    if (!canManageUsers(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validierung
    const validatedData = setPasswordSchema.parse(body);

    // Prüfe ob User existiert
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    // Hash Passwort
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Aktualisiere Passwort
    await db.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logger.success("ADMIN", "USER_PASSWORD_SET", `Passwort für User ${existingUser.email} gesetzt`, {
      userId: id,
      email: existingUser.email,
      updatedBy: session.user.id,
    });

    // Audit Log (keine Passwort-Details!)
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "User",
        id: existingUser.id,
        label: existingUser.email,
      },
      action: AuditAction.OTHER,
      message: `Passwort für Benutzer "${existingUser.email}" geändert`,
    });

    return NextResponse.json({ ok: true, message: "Passwort erfolgreich gesetzt" });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Setzen des Passworts:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

