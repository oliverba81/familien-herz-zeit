import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { courseSchema } from "@/lib/validations/courses";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { tagCourse, tagCourses } from "@/lib/seo/tags";
import { dateTimeToUtcDate } from "@/lib/utils/datetime-convert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses
 * Gibt alle Kurse zurück (nur für Admin/Editor)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await db.course.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Kurse:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses
 * Erstellt einen neuen Kurs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validierung
    const validatedData = courseSchema.parse(body);

    // Extrahiere Sessions aus validatedData
    const { sessions, ...courseData } = validatedData;

    // Erstelle Kurs mit Sessions (nur wenn Sessions vorhanden)
    const course = await db.course.create({
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
    await logAudit({
      actor,
      entity: { type: "Course", id: course.id, label: course.title },
      action: AuditAction.CREATE,
      message: `Kurs "${course.title}" erstellt mit ${sessions?.length || 0} Termin(en)`,
    });

    // Revalidation
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagCourses());

    return NextResponse.json(course, { status: 201 });
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
    console.error("Fehler beim Erstellen des Kurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

