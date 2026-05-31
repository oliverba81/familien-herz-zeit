import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { syncSeriesOccurrencesSafe } from "@/lib/courses/series-sync-safe";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/course-series/[id]/sync
 * Synchronisiert Termine für eine Serie (Safe Mode)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;

    // Lade Serie für Label
    const series = await db.courseSeries.findUnique({
      where: { id },
      select: { title: true },
    });

    const result = await syncSeriesOccurrencesSafe(id);

    // Limitiere Details für Response (max 20 items)
    const limitedDetails = {
      created: result.details.created.slice(0, 20),
      updated: result.details.updated.slice(0, 20),
      cancelled: result.details.cancelled.slice(0, 20),
      skippedLocked: result.details.skippedLocked.slice(0, 20),
      keptBecauseBooked: result.details.keptBecauseBooked.slice(0, 20),
    };

    const response = {
      ok: true,
      created: result.created,
      updated: result.updated,
      cancelled: result.cancelled,
      skippedLocked: result.skippedLocked,
      keptBecauseBooked: result.keptBecauseBooked,
      warnings: result.warnings,
      details: limitedDetails,
      // Zusätzliche Counts für überschrittene Limits
      _meta: {
        createdTotal: result.details.created.length,
        updatedTotal: result.details.updated.length,
        cancelledTotal: result.details.cancelled.length,
        skippedLockedTotal: result.details.skippedLocked.length,
        keptBecauseBookedTotal: result.details.keptBecauseBooked.length,
      },
    };

    await logger.success("ADMIN", "SERIES_SYNCED_SAFE", `Serie synchronisiert (Safe): ${result.created} erstellt, ${result.updated} aktualisiert, ${result.cancelled} abgesagt`, {
      seriesId: id,
      ...response,
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "CourseSeries",
        id,
        label: series?.title || id,
      },
      action: AuditAction.SYNC,
      message: `Serie "${series?.title || id}" synchronisiert`,
      meta: {
        created: result.created,
        updated: result.updated,
        cancelled: result.cancelled,
        skippedLocked: result.skippedLocked,
        keptBecauseBooked: result.keptBecauseBooked,
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    await logger.error("ADMIN", "SERIES_SYNC_ERROR", "Fehler beim Synchronisieren der Serie", error as Error, {
      seriesId: (await params).id,
    });

    return NextResponse.json(
      { error: "Fehler beim Synchronisieren", details: error.message },
      { status: 500 }
    );
  }
}

