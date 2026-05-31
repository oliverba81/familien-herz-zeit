import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { waitlistEntrySchema } from "@/lib/validations/waitlist";
import { getChildAgeMonths } from "@/lib/utils/age";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/waitlist
 * Liste aller Wartelisten-Einträge mit Filtern
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
    const courseIdParam = searchParams.get("courseId");
    const queryParam = searchParams.get("q");
    const takeParam = searchParams.get("take");

    const where: any = {};

    if (courseIdParam) {
      where.courseId = courseIdParam;
    }

    if (queryParam) {
      where.OR = [
        { firstName: { contains: queryParam, mode: "insensitive" } },
        { lastName: { contains: queryParam, mode: "insensitive" } },
        { email: { contains: queryParam, mode: "insensitive" } },
      ];
    }

    const defaultTake = 200;
    const take = takeParam ? Math.min(parseInt(takeParam, 10), 500) : defaultTake;

    const entries = await db.waitlistEntry.findMany({
      where,
      take,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const result = entries.map((entry) => {
      let childAgeMonths: number | null = null;
      if (entry.childBirthDate) {
        childAgeMonths = getChildAgeMonths(entry.childBirthDate);
      }

      return {
        ...entry,
        childAgeMonths,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    console.error("Fehler beim Abrufen der Warteliste:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/waitlist
 * Neuen Wartelisten-Eintrag anlegen
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = waitlistEntrySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const created = await db.waitlistEntry.create({
      data: {
        courseId: data.courseId || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        childFirstName: data.childFirstName || null,
        childLastName: data.childLastName || null,
        childBirthDate: data.childBirthDate ? new Date(data.childBirthDate) : null,
        childNotes: data.childNotes || null,
        interestLabel: data.interestLabel || null,
        notes: data.notes || null,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    let childAgeMonths: number | null = null;
    if (created.childBirthDate) {
      childAgeMonths = getChildAgeMonths(created.childBirthDate);
    }

    return NextResponse.json(
      {
        ...created,
        childAgeMonths,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    console.error("Fehler beim Anlegen eines Wartelisten-Eintrags:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

