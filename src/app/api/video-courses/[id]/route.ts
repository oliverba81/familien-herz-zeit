import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { videoCourseSchema, prepareVideoCourseData } from "@/lib/validations/video-courses";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/video-courses/[id]
 * Gibt einen einzelnen Videokurs zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const course = await db.videoCourse.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Wenn nicht veröffentlicht und User nicht eingeloggt → 404
    if (course.status !== "PUBLISHED" && (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EDITOR"))) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error: any) {
    console.error("Fehler beim Abrufen des Videokurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/video-courses/[id]
 * Aktualisiert einen Videokurs
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
    const preparedData = prepareVideoCourseData(body);
    
    // Validierung
    const validatedData = videoCourseSchema.parse(preparedData);

    // Prüfe ob Kurs existiert
    const existing = await db.videoCourse.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Prüfe Slug-Uniqueness (ausschließen der aktuellen ID)
    const slugConflict = await db.videoCourse.findFirst({
      where: {
        slug: validatedData.slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "Slug bereits vergeben" },
        { status: 409 }
      );
    }

    // Aktualisiere Videokurs
    // Konvertiere durationMinutes zu durationSeconds
    const { durationMinutes, ...restData } = validatedData;
    const course = await db.videoCourse.update({
      where: { id },
      data: {
        ...restData,
        durationSeconds: durationMinutes ? durationMinutes * 60 : null,
      },
    });

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
    console.error("Fehler beim Aktualisieren des Videokurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video-courses/[id]
 * Löscht einen Videokurs
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
    const course = await db.videoCourse.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Audit Log (vor dem Löschen)
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "VideoCourse",
        id: course.id,
        label: course.slug,
      },
      action: AuditAction.DELETE,
      message: `Videokurs "${course.title}" gelöscht`,
    });

    // Revalidate Cache
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagVideoCourse(course.id));
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagVideoCourses());

    // Lösche Videokurs
    await db.videoCourse.delete({
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
    console.error("Fehler beim Löschen des Videokurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

