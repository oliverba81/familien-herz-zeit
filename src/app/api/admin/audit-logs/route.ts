import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageUsers } from "@/lib/auth/policies";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs
 * Gibt Audit-Logs zurück (ADMIN only)
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

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const actorUserId = searchParams.get("actorUserId");
    const q = searchParams.get("q"); // Textsuche
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const take = Math.min(parseInt(searchParams.get("take") || "50", 10), 200);

    // Baue Where-Clause
    const where: any = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (action) {
      where.action = action;
    }

    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    if (q) {
      where.OR = [
        { actorEmail: { contains: q, mode: "insensitive" } },
        { entityLabel: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ];
    }

    // Lade Logs
    const logs = await db.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    return NextResponse.json(logs);
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
    console.error("Fehler beim Abrufen der Audit-Logs:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}





