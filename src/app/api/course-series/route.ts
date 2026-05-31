import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { courseSeriesSchema } from "@/lib/validations/course-series";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/course-series
 * Gibt alle Serien zurück
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const series = await db.courseSeries.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    return NextResponse.json(series);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Serien:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/course-series
 * Erstellt eine neue Serie
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const body = await request.json();

    // Validierung
    const validatedData = courseSeriesSchema.parse(body);

    // Erstelle Serie
    const series = await db.courseSeries.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        durationMinutes: validatedData.durationMinutes,
        priceCents: validatedData.priceCents,
        maxParticipants: validatedData.maxParticipants,
        location: validatedData.location || null,
        status: validatedData.status,
        timezone: validatedData.timezone,
        frequency: validatedData.frequency,
        intervalWeeks: validatedData.intervalWeeks,
        weekdays: validatedData.weekdays,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        startTime: validatedData.startTime,
      },
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "CourseSeries",
        id: series.id,
        label: series.title,
      },
      action: AuditAction.CREATE,
      message: `Serie "${series.title}" erstellt`,
      meta: {
        frequency: series.frequency,
        intervalWeeks: series.intervalWeeks,
      },
    });

    return NextResponse.json(series, { status: 201 });
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
    console.error("Fehler beim Erstellen der Serie:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

