import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { toCsv } from "@/lib/utils/csv";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings/export
 * Exportiert Buchungen als CSV
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

    // Build where clause (gleiche Logik wie GET /api/admin/bookings)
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

    const bookings = await db.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        course: {
          select: {
            title: true,
            sessions: {
              orderBy: {
                startAt: "asc",
              },
              take: 1, // Nur die erste Session für die Anzeige
            },
          },
        },
      },
    });

    // Konvertiere zu CSV-Format
    const csvRows = bookings.map((booking) => ({
      createdAt: formatBerlinDateTime(booking.createdAt),
      status: booking.status,
      courseTitle: booking.course.title,
      courseStartAt: booking.course.sessions && booking.course.sessions.length > 0
        ? formatBerlinDateTime(booking.course.sessions[0].startAt)
        : "Kein Termin",
      parentName: booking.parentName,
      email: booking.email,
      phone: booking.phone || "",
      childName: booking.childName || "",
      childAgeMonths: booking.childAgeMonths || "",
    }));

    const csvHeaders = [
      "Erstellt am",
      "Status",
      "Kurs",
      "Kurs Start",
      "Elternname",
      "E-Mail",
      "Telefon",
      "Kindername",
      "Alter (Monate)",
    ];

    const csv = toCsv(csvRows, csvHeaders, ";");

    // Dateiname mit aktuellem Datum
    const today = new Date().toISOString().split("T")[0];
    const filename = `bookings-${today}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Export der Buchungen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

