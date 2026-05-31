import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { courseSeriesSchema } from "@/lib/validations/course-series";
import { logAudit, getActorFromSession, getChangedFields } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/course-series/[id]
 * Gibt eine Serie zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;

    const series = await db.courseSeries.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    if (!series) {
      return NextResponse.json(
        { error: "Serie nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(series);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Serie:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/course-series/[id]
 * Aktualisiert eine Serie
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;
    const body = await request.json();

    // Prüfe ob Serie existiert
    const existing = await db.courseSeries.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Serie nicht gefunden" },
        { status: 404 }
      );
    }

    // Validierung
    const validatedData = courseSeriesSchema.parse(body);

    // Aktualisiere Serie
    const series = await db.courseSeries.update({
      where: { id },
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
    const changedFields = getChangedFields(
      {
        title: existing.title,
        status: existing.status,
        intervalWeeks: existing.intervalWeeks,
      },
      {
        title: series.title,
        status: series.status,
        intervalWeeks: series.intervalWeeks,
      }
    );
    
    await logAudit({
      actor,
      entity: {
        type: "CourseSeries",
        id: series.id,
        label: series.title,
      },
      action: AuditAction.UPDATE,
      message: `Serie "${series.title}" aktualisiert`,
      meta: {
        changedFields,
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
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Aktualisieren der Serie:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

