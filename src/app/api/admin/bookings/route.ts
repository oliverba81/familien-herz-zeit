import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings
 * Gibt alle Buchungen zurück mit Filtern
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const courseIdParam = searchParams.get("courseId");
    const queryParam = searchParams.get("q");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const takeParam = searchParams.get("take");

    // Build where clause
    const where: any = {};

    if (statusParam && ["PENDING", "CONFIRMED", "CANCELLED"].includes(statusParam)) {
      where.status = statusParam as BookingStatus;
    }

    if (courseIdParam) {
      where.courseId = courseIdParam;
    }

    if (queryParam) {
      where.OR = [
        { parentName: { contains: queryParam, mode: "insensitive" } },
        { email: { contains: queryParam, mode: "insensitive" } },
      ];
    }

    if (fromParam || toParam) {
      where.createdAt = {};
      if (fromParam) {
        where.createdAt.gte = new Date(fromParam);
      }
      if (toParam) {
        where.createdAt.lte = new Date(toParam);
      }
    }

    // Erhöhe Standard-Limit für Kurs-spezifische Abfragen
    const defaultTake = courseIdParam ? 500 : 50; // Mehr Buchungen wenn für einen spezifischen Kurs
    const take = takeParam ? Math.min(parseInt(takeParam), 200) : defaultTake;

    const bookings = await db.booking.findMany({
      where,
      take,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            sessions: {
              orderBy: {
                startAt: "asc",
              },
              take: 1, // Nur erste Session für Anzeige
              select: {
                startAt: true,
              },
            },
          },
        },
        session: {
          select: {
            id: true,
            startAt: true,
            durationMinutes: true,
          },
        },
      },
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Buchungen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

