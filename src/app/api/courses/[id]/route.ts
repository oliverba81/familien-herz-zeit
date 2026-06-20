import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { courseSchema } from "@/lib/validations/courses";
import { logAudit, getActorFromSession, getChangedFields } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "@/lib/cache/revalidate";
import { tagCourse, tagCourses } from "@/lib/seo/tags";
import { dateTimeToUtcDate } from "@/lib/utils/datetime-convert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses/[id]
 * Gibt einen einzelnen Kurs zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: {
            startAt: "asc",
          },
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: {
                  in: ["PENDING", "CONFIRMED"],
                },
              },
            },
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

    return NextResponse.json(course);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen des Kurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/[id]
 * Aktualisiert einen Kurs
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validierung
    const validatedData = courseSchema.parse(body);

    // Prüfe ob Kurs existiert
    const existing = await db.course.findUnique({
      where: { id },
      include: {
        sessions: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Extrahiere Sessions aus validatedData
    const { sessions, ...courseData } = validatedData;

    // Aktualisiere Kurs und Sessions
    // 1. Lösche alle bestehenden Sessions
    await db.courseSession.deleteMany({
      where: { courseId: id },
    });

    // 2. Aktualisiere Kurs und erstelle neue Sessions (nur wenn Sessions vorhanden)
    const course = await db.course.update({
      where: { id },
      data: {
        ...courseData,
        plannedMonth: validatedData.plannedMonth || null,
        plannedYear: validatedData.plannedYear || null,
        sessions: sessions && sessions.length > 0 ? {
          create: sessions.map((session) => {
            // Konvertiere date und time (als Berlin-Zeit interpretiert) zu UTC Date
            const startAtUtc = dateTimeToUtcDate(session.date, session.time);
            return {
              startAt: startAtUtc,
              durationMinutes: session.durationMinutes,
            };
          }),
        } : undefined,
      },
      include: {
        sessions: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    // Audit Log
    const actor = await getActorFromSession();
    const changedFields = getChangedFields(
      {
        title: existing.title,
        description: existing.description,
        priceCents: existing.priceCents,
        maxParticipants: existing.maxParticipants,
        location: existing.location,
        acceptsAokVoucher: existing.acceptsAokVoucher || false,
        status: existing.status,
        category: existing.category || "AUTO",
      },
      courseData,
      ["title", "description", "priceCents", "maxParticipants", "location", "acceptsAokVoucher", "status", "category"]
    );
    
    await logAudit({
      actor,
      entity: { type: "Course", id: course.id, label: course.title },
      action: AuditAction.UPDATE,
      message: `Kurs "${course.title}" aktualisiert`,
      meta: {
        changedFields,
        sessionsCount: sessions?.length || 0,
      },
    });

    // Revalidation
    revalidateTag(tagCourse(id));
    revalidateTag(tagCourses());

    return NextResponse.json(course);
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
    console.error("Fehler beim Aktualisieren des Kurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler", details: error.message || String(error), stack: process.env.NODE_ENV === "development" ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[id]
 * Löscht einen Kurs
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Nur ADMIN darf löschen
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prüfe ob Kurs existiert
    const course = await db.course.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Lösche Kurs (Cascade löscht auch Bookings)
    await db.course.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Löschen des Kurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

