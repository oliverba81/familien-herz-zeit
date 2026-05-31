import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { navigationItemSchema } from "@/lib/validations/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/navigation
 * Gibt Navigation Items zurück (public für Frontend, auth für Admin)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get("location") as "HEADER" | "FOOTER" | null;

    const where: any = {};
    if (location) {
      where.location = location;
    }

    const items = await db.navigationItem.findMany({
      where: {
        ...where,
        parentId: null, // Nur Root-Items
      },
      include: {
        children: {
          orderBy: { order: "asc" },
          include: {
            children: {
              orderBy: { order: "asc" },
              include: {
                children: {
                  orderBy: { order: "asc" },
                  include: {
                    children: {
                      orderBy: { order: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Fehler beim Abrufen der Navigation:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/navigation
 * Erstellt ein neues Navigation Item (auth required)
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
    const validatedData = navigationItemSchema.parse(body);

    const item = await db.navigationItem.create({
      data: validatedData,
      include: {
        children: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
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
    console.error("Fehler beim Erstellen des Navigation Items:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

