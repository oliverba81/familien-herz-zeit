import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { pageUpsertSchema } from "@/lib/validations/pages";
import { slugify } from "@/lib/utils/slugify";
import { db } from "@/lib/db";

// GET /api/pages - Liste aller Seiten
export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pages = await db.page.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(pages);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/pages - Neue Seite erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Slug automatisch generieren, falls leer
    if (!body.slug && body.title) {
      body.slug = slugify(body.title);
    }

    // Setze published default auf false falls nicht vorhanden
    if (body.published === undefined) {
      body.published = false;
    }

    // Validierung
    const validatedData = pageUpsertSchema.parse(body);

    // Prüfe ob Slug bereits existiert
    const existingPage = await db.page.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: "Eine Seite mit diesem Slug existiert bereits" },
        { status: 409 }
      );
    }

    // Parse contentJson falls String
    let contentJson = validatedData.contentJson;
    if (typeof contentJson === "string") {
      try {
        contentJson = JSON.parse(contentJson);
      } catch (e) {
        return NextResponse.json(
          { error: "Ungültiges JSON in contentJson" },
          { status: 400 }
        );
      }
    }

    // Erstelle Seite
    const page = await db.page.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        published: validatedData.published,
        contentJson: contentJson,
      },
    });

    return NextResponse.json(page, { status: 201 });
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
    console.error("Error creating page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

