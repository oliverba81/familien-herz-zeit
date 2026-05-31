import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const batchUpdateSchema = z.object({
  applyFrom: z.string().optional(), // ISO date string
  fields: z.object({
    priceCents: z.number().int().min(0).optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
    maxParticipants: z.number().int().min(1).max(100).optional(),
    location: z.string().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: "Mindestens ein Feld muss angegeben werden" }
  ),
});

/**
 * POST /api/course-series/[id]/batch-update
 * Aktualisiert alle zukünftigen Termine einer Serie (ohne Buchungen)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;
    const body = await request.json();

    // Validierung
    const validatedData = batchUpdateSchema.parse(body);

    // Prüfe ob Serie existiert
    const series = await db.courseSeries.findUnique({
      where: { id },
    });

    if (!series) {
      return NextResponse.json(
        { error: "Serie nicht gefunden" },
        { status: 404 }
      );
    }

    // Bestimme Start-Datum
    const applyFromDate = validatedData.applyFrom
      ? new Date(validatedData.applyFrom)
      : new Date();

    // Finde alle zukünftigen Termine der Serie
    // Ein Kurs ist "zukünftig", wenn er mindestens eine Session mit startAt >= applyFromDate hat
    const courses = await db.course.findMany({
      where: {
        seriesId: id,
        sessions: {
          some: {
            startAt: {
              gte: applyFromDate,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (courses.length === 0) {
      return NextResponse.json({
        updated: 0,
        skippedBooked: 0,
        message: "Keine zukünftigen Termine gefunden",
      });
    }

    const courseIds = courses.map((c) => c.id);

    // Prüfe welche Termine Buchungen haben
    const bookingsByCourse = await db.booking.groupBy({
      by: ["courseId"],
      where: {
        courseId: {
          in: courseIds,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      _count: true,
    });

    const coursesWithBookings = new Set(
      bookingsByCourse.map((b) => b.courseId)
    );

    // Filter: Nur Termine ohne Buchungen
    const coursesToUpdate = courseIds.filter(
      (courseId) => !coursesWithBookings.has(courseId)
    );

    // Baue Update-Data (nur angegebene Felder)
    const updateData: any = {};
    if (validatedData.fields.priceCents !== undefined) {
      updateData.priceCents = validatedData.fields.priceCents;
    }
    if (validatedData.fields.durationMinutes !== undefined) {
      updateData.durationMinutes = validatedData.fields.durationMinutes;
    }
    if (validatedData.fields.maxParticipants !== undefined) {
      updateData.maxParticipants = validatedData.fields.maxParticipants;
    }
    if (validatedData.fields.location !== undefined) {
      updateData.location = validatedData.fields.location;
    }
    if (validatedData.fields.status !== undefined) {
      updateData.status = validatedData.fields.status;
    }

    // Update durchführen
    let updated = 0;
    if (coursesToUpdate.length > 0) {
      const result = await db.course.updateMany({
        where: {
          id: {
            in: coursesToUpdate,
          },
        },
        data: updateData,
      });
      updated = result.count;
    }

    const skippedBooked = coursesWithBookings.size;

    await logger.success("ADMIN", "SERIES_BATCH_UPDATED", `Batch-Update für Serie durchgeführt: ${updated} Termine aktualisiert`, {
      seriesId: id,
      updated,
      skippedBooked,
      applyFrom: applyFromDate.toISOString(),
      fields: validatedData.fields,
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "CourseSeries",
        id,
        label: series.title,
      },
      action: AuditAction.BATCH_UPDATE,
      message: `Batch-Update für Serie "${series.title}": ${updated} Termine aktualisiert`,
      meta: {
        updated,
        skippedBooked,
        total: courses.length,
        fields: Object.keys(validatedData.fields),
      },
    });

    return NextResponse.json({
      updated,
      skippedBooked,
      total: courses.length,
    });
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

    await logger.error("ADMIN", "SERIES_BATCH_UPDATE_ERROR", "Fehler beim Batch-Update der Serie", error as Error, {
      seriesId: (await params).id,
    });

    return NextResponse.json(
      { error: "Fehler beim Batch-Update", details: error.message },
      { status: 500 }
    );
  }
}

