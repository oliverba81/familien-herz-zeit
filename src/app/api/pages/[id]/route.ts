import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { pageUpsertSchema } from "@/lib/validations/pages";
import { db } from "@/lib/db";

// GET /api/pages/:id - Einzelne Seite abrufen
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
    const page = await db.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/pages/:id - Seite aktualisieren
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

    // Setze published default auf false falls nicht vorhanden
    if (body.published === undefined) {
      body.published = false;
    }

    // Validierung
    const validatedData = pageUpsertSchema.parse(body);

    // Prüfe ob Seite existiert
    const existingPage = await db.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    // Prüfe ob Slug bereits von anderer Seite verwendet wird
    const slugConflict = await db.page.findFirst({
      where: {
        slug: validatedData.slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "Eine andere Seite mit diesem Slug existiert bereits" },
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

    // Aktualisiere Seite
    const page = await db.page.update({
      where: { id },
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        published: validatedData.published,
        contentJson: contentJson,
      },
    });

    return NextResponse.json(page);
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
    console.error("Error updating page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/:id - Seite löschen
export async function DELETE(
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

    // Prüfe ob Seite existiert
    const existingPage = await db.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    // Lösche Seite
    await db.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

