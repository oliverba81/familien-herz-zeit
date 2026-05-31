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

const createUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  role: z.enum(["ADMIN", "EDITOR", "CUSTOMER"]),
  name: z.string().optional(),
});

/**
 * GET /api/admin/users
 * Gibt alle Users zurück (ADMIN only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleOrThrow(["ADMIN"]);

    if (!canManageUsers(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
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
    console.error("Fehler beim Abrufen der Users:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Erstellt einen neuen User (ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleOrThrow(["ADMIN"]);

    if (!canManageUsers(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Prüfe ob Email bereits existiert
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "E-Mail-Adresse bereits registriert" },
        { status: 409 }
      );
    }

    // Hash Passwort
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Erstelle User
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
        name: validatedData.name || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        name: true,
        createdAt: true,
      },
    });

    await logger.success("ADMIN", "USER_CREATED", `User erstellt: ${user.email}`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdBy: session.user.id,
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "User",
        id: user.id,
        label: user.email,
      },
      action: AuditAction.CREATE,
      message: `Benutzer "${user.email}" erstellt`,
      meta: {
        role: user.role,
      },
    });

    return NextResponse.json(user, { status: 201 });
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
    console.error("Fehler beim Erstellen des Users:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

