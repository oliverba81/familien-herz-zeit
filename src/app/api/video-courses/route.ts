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
 * GET /api/video-courses
 * Gibt alle Videokurse zurück (nur veröffentlichte für nicht-authentifizierte User)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const publishedParam = searchParams.get("published");

    // Wenn User eingeloggt ist (ADMIN/EDITOR), zeige alle
    // Sonst nur veröffentlichte
    let where: { status?: "PUBLISHED" } = {};
    
    if (session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR") {
      // Admin/Editor kann nach published filtern
      if (publishedParam === "true") {
        where.status = "PUBLISHED";
      } else if (publishedParam === "false") {
        // Zeige alle (kein Filter)
        where = {};
      }
      // Wenn kein Filter, zeige alle
    } else {
      // Nicht-authentifizierte User sehen nur veröffentlichte
      where.status = "PUBLISHED";
    }

    const courses = await db.videoCourse.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    console.error("Fehler beim Abrufen der Videokurse:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/video-courses
 * Erstellt einen neuen Videokurs
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
    const preparedData = prepareVideoCourseData(body);
    
    // Validierung
    const validatedData = videoCourseSchema.parse(preparedData);

    // Prüfe Slug-Uniqueness
    const existing = await db.videoCourse.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Slug bereits vergeben" },
        { status: 409 }
      );
    }

    // Erstelle Videokurs
    // Konvertiere durationMinutes zu durationSeconds
    const { durationMinutes, ...restData } = validatedData;
    const course = await db.videoCourse.create({
      data: {
        ...restData,
        durationSeconds: durationMinutes ? durationMinutes * 60 : null,
      },
    });

      // Audit Log
      const actor = await getActorFromSession();
      await logAudit({
        actor,
        entity: {
          type: "VideoCourse",
          id: course.id,
          label: course.slug,
        },
        action: AuditAction.CREATE,
        message: `Videokurs "${course.title}" erstellt`,
        meta: {
          slug: course.slug,
          status: course.status,
        },
      });

      // Revalidate Cache
      // @ts-ignore - TypeScript type issue with revalidateTag
      revalidateTag(tagVideoCourse(course.id));
      // @ts-ignore - TypeScript type issue with revalidateTag
      revalidateTag(tagVideoCourses());

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
    console.error("Fehler beim Erstellen des Videokurses:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

