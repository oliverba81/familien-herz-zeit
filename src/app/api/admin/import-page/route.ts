import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/import-page
 * Importiert eine Seite von einer externen URL
 * 
 * Body: { url: string, title: string, slug?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, title, slug } = body;

    if (!url || !title) {
      return NextResponse.json(
        { error: "url und title sind erforderlich" },
        { status: 400 }
      );
    }

    // Versuche, die Seite abzurufen
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Familien-Herz-Zeit-Importer/1.0)",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Fehler beim Abrufen der Seite: ${response.status}` },
          { status: 400 }
        );
      }

      const html = await response.text();
      
      // Einfaches HTML-Parsing (sehr basic)
      // Entferne Scripts und Styles
      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

      // Extrahiere Text-Inhalt (sehr vereinfacht)
      const textMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                       cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                       cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

      const content = textMatch ? textMatch[1] : cleanHtml;

      // Erstelle Page Builder Content
      const pageSlug = slug || slugify(title);
      
      // Prüfe ob Slug bereits existiert
      const existing = await db.page.findUnique({
        where: { slug: pageSlug },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Eine Seite mit diesem Slug existiert bereits" },
          { status: 409 }
        );
      }

      // Erstelle eine einfache Page mit Text-Block
      const pageContent = {
        blocks: [
          {
            type: "hero",
            heading: title,
            subheading: "",
          },
          {
            type: "text",
            text: content.substring(0, 5000), // Limitiere auf 5000 Zeichen
          },
        ],
      };

      const page = await db.page.create({
        data: {
          title,
          slug: pageSlug,
          published: false, // Standardmäßig nicht veröffentlicht
          contentJson: pageContent,
        },
      });

      return NextResponse.json({
        success: true,
        page,
        message: "Seite wurde erstellt. Bitte im Page Builder überarbeiten.",
      });
    } catch (fetchError: any) {
      return NextResponse.json(
        { error: `Fehler beim Abrufen: ${fetchError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    console.error("Fehler beim Importieren der Seite:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

