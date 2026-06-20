import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageUsers } from "@/lib/auth/policies";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logging/logger";
import { UserRole } from "@prisma/client";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "CUSTOMER"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
});

/**
 * PATCH /api/admin/users/[id]
 * Aktualisiert einen User (ADMIN only)
 */
export async function PATCH(
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
    const validatedData = updateUserSchema.parse(body);

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

    // Warnung: User versucht sich selbst zu deaktivieren
    if (validatedData.isActive === false && session.user.id === id) {
      return NextResponse.json(
        { error: "Du kannst dich nicht selbst deaktivieren" },
        { status: 400 }
      );
    }

    // Aktualisiere User
    const user = await db.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        name: true,
        createdAt: true,
      },
    });

    await logger.success("ADMIN", "USER_UPDATED", `User aktualisiert: ${user.email}`, {
      userId: user.id,
      email: user.email,
      changes: validatedData,
      updatedBy: session.user.id,
    });

    // Audit Log
    const actor = await getActorFromSession();
    const action = validatedData.isActive !== undefined && existingUser.isActive !== validatedData.isActive
      ? AuditAction.STATUS_CHANGE
      : AuditAction.UPDATE;
    
    await logAudit({
      actor,
      entity: {
        type: "User",
        id: user.id,
        label: user.email,
      },
      action,
      message: action === AuditAction.STATUS_CHANGE
        ? `Benutzer "${user.email}" ${validatedData.isActive ? "aktiviert" : "deaktiviert"}`
        : validatedData.role
        ? `Benutzer "${user.email}" Rolle geändert: ${existingUser.role} → ${validatedData.role}`
        : `Benutzer "${user.email}" aktualisiert`,
      meta: {
        oldRole: existingUser.role,
        newRole: validatedData.role || existingUser.role,
        oldIsActive: existingUser.isActive,
        newIsActive: validatedData.isActive !== undefined ? validatedData.isActive : existingUser.isActive,
      },
    });

    return NextResponse.json(user);
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
    console.error("Fehler beim Aktualisieren des Users:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

