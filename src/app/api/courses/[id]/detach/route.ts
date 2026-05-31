import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/courses/[id]/detach
 * Koppelt einen Kurs von seiner Serie ab (setzt seriesId = null)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;

    // Prüfe ob Kurs existiert
    const course = await db.course.findUnique({
      where: { id },
      include: {
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    if (!course.seriesId) {
      return NextResponse.json(
        { error: "Kurs ist nicht Teil einer Serie" },
        { status: 400 }
      );
    }

    // Kopple ab
    await db.course.update({
      where: { id },
      data: {
        seriesId: null,
      },
    });

    await logger.success("ADMIN", "COURSE_DETACHED", `Kurs von Serie abgekoppelt: ${course.title}`, {
      courseId: id,
      seriesId: course.seriesId,
      seriesTitle: course.series?.title,
    });

    return NextResponse.json({
      ok: true,
      message: "Kurs erfolgreich von Serie abgekoppelt",
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    await logger.error("ADMIN", "COURSE_DETACH_ERROR", "Fehler beim Abkoppeln des Kurses", error as Error, {
      courseId: (await params).id,
    });

    return NextResponse.json(
      { error: "Fehler beim Abkoppeln", details: error.message },
      { status: 500 }
    );
  }
}

