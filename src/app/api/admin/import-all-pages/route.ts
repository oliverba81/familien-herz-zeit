import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils/slugify";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alle zu importierenden Seiten
const PAGES_TO_IMPORT = [
  { slug: "", title: "Startseite", url: "https://www.familien-herz-zeit.de/" },
  { slug: "babyzeichensprachekurs", title: "Babyzeichensprachekurs", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/eltern-kind-kurse/babyzeichensprachekurs" },
  { slug: "themenstunden", title: "Themenstunden", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/eltern-kind-kurse/themenstunden" },
  { slug: "elternkurse", title: "Elternkurse", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/elternkurse" },
  { slug: "workshops-eltern", title: "Workshops für Eltern", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/workshops" },
  { slug: "elternberatung", title: "Elternberatung", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/elternberatung" },
  { slug: "weiterbildungen", title: "Weiterbildungen", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/weiterbildungen" },
  { slug: "workshops-fachpersonal", title: "Workshops für Fachpersonal", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/workshops" },
  { slug: "themenstunden-fachpersonal", title: "Themenstunden für Fachpersonal", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/themenstunden" },
  { slug: "elternabende", title: "Elternabende", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/elternabende" },
  { slug: "vortraege-und-seminare", title: "Vorträge und Seminare", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/vortraege-und-seminare" },
  { slug: "kursanmeldung-babyzeichensprache", title: "Anmeldung Babyzeichensprachekurs", url: "https://www.familien-herz-zeit.de/kursanmeldung/kursanmeldung-babyzeichensprache" },
  { slug: "kursanmeldung-themenstunden", title: "Anmeldung Themenstunden", url: "https://www.familien-herz-zeit.de/kursanmeldung/kursanmeldung-themenstunden" },
  { slug: "babyzeichensprache/was-ist-das", title: "Was ist das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/was-ist-das" },
  { slug: "babyzeichensprache/wie-funktioniert-das", title: "Wie funktioniert das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/wie-funktioniert-das" },
  { slug: "babyzeichensprache/ab-welchem-alter", title: "Ab welchem Alter?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/ab-welchem-alter" },
  { slug: "babyzeichensprache/fuer-wen-geeignet", title: "Für wen geeignet?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/fuer-wen-geeignet" },
  { slug: "babyzeichensprache/auch-fuer-groessere-kinder", title: "Auch für größere Kinder?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/auch-fuer-groessere-kinder" },
  { slug: "babyzeichensprache/hintergruende", title: "Hintergründe", url: "https://www.familien-herz-zeit.de/babyzeichensprache/hintergruende" },
  { slug: "babyzeichensprache/wissenschaft", title: "Wissenschaft", url: "https://www.familien-herz-zeit.de/babyzeichensprache/wissenschaft" },
  { slug: "babyzeichensprache/babyzeichen-kindermund", title: "Babyzeichen-Kindermund", url: "https://www.familien-herz-zeit.de/babyzeichensprache/babyzeichen-kindermund" },
  { slug: "babyzeichensprache/haeufige-fragen", title: "Häufige Fragen", url: "https://www.familien-herz-zeit.de/babyzeichensprache/haeufige-fragen-in-der-praxis" },
  { slug: "ueber-mich/persoenlich", title: "Persönlich", url: "https://www.familien-herz-zeit.de/ueber-mich/persoenlich" },
  { slug: "ueber-mich/beruflich", title: "Beruflich", url: "https://www.familien-herz-zeit.de/ueber-mich/beruflich" },
  { slug: "ueber-mich/ehrenamtlich", title: "Ehrenamtlich", url: "https://www.familien-herz-zeit.de/ueber-mich/ehrenamtlich" },
  { slug: "kontakt", title: "Kontakt", url: "https://www.familien-herz-zeit.de/kontakt" },
  { slug: "impressum", title: "Impressum", url: "https://www.familien-herz-zeit.de/impressum" },
  { slug: "datenschutzerklaerung", title: "Datenschutzerklärung", url: "https://www.familien-herz-zeit.de/datenschutzerklaerung" },
];

async function fetchPageContent(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Familien-Herz-Zeit-Importer/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Entferne Scripts, Styles, Nav, Footer
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

    // Extrahiere Hauptinhalt
    const mainMatch =
      cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      cleanHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const content = mainMatch ? mainMatch[1] : cleanHtml;

    // Extrahiere Text
    const text = content
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 15000);

    // Extrahiere Überschriften
    const headings: Array<{ level: number; text: string }> = [];
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h2Matches = Array.from(content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi));
    const h3Matches = Array.from(content.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi));

    if (h1Match) {
      const text = h1Match[1].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push({ level: 1, text });
    }

    for (const match of h2Matches) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push({ level: 2, text });
    }

    for (const match of h3Matches) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push({ level: 3, text });
    }

    return { text, headings, rawHtml: content };
  } catch (error: any) {
    console.error(`Fehler beim Abrufen von ${url}:`, error.message);
    return null;
  }
}

function createPageContent(title: string, content: { text: string; headings: Array<{ level: number; text: string }> }) {
  const blocks: any[] = [];
  let blockIndex = 0;

  // Helper zum Erstellen von Blocks mit ID
  const createBlock = (type: string, data: any) => {
    blockIndex++;
    return {
      id: `${type}-${Date.now()}-${blockIndex}`,
      type,
      data,
    };
  };

  // Hero Block mit Titel
  blocks.push(createBlock("hero", {
    heading: title,
    subheading: "",
    align: "center",
  }));

  // Füge Überschriften hinzu
  for (const heading of content.headings.slice(0, 15)) {
    if (heading.level === 1 && heading.text !== title) {
      blocks.push(createBlock("hero", {
        heading: heading.text,
        subheading: "",
        align: "center",
      }));
    } else if (heading.level === 2) {
      blocks.push(createBlock("text", {
        text: `<h2 class="text-2xl font-bold mt-8 mb-4">${heading.text}</h2>`,
      }));
    } else if (heading.level === 3) {
      blocks.push(createBlock("text", {
        text: `<h3 class="text-xl font-semibold mt-6 mb-3">${heading.text}</h3>`,
      }));
    }
  }

  // Text-Block mit Hauptinhalt
  if (content.text) {
    // Teile Text in Absätze
    const paragraphs = content.text
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 20)
      .slice(0, 20); // Max 20 Absätze

    for (const paragraph of paragraphs) {
      // Konvertiere Links in HTML
      const paragraphHtml = cleanAndConvertHtml(`<p class="mb-4">${paragraph.trim()}</p>`);
      blocks.push(createBlock("text", {
        text: paragraphHtml,
      }));
    }
  }

  // Spacer am Ende
  blocks.push(createBlock("spacer", {
    size: "md",
  }));

  return { blocks };
}

/**
 * POST /api/admin/import-all-pages
 * Importiert alle Seiten von der Original-Website
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Array<{ page: typeof PAGES_TO_IMPORT[0]; success: boolean; error?: string }> = [];

    for (const page of PAGES_TO_IMPORT) {
      try {
        // Prüfe ob Seite bereits existiert
        const pageSlug = page.slug || "startseite";
        const existing = await db.page.findUnique({
          where: { slug: pageSlug },
        });

        if (existing) {
          results.push({
            page,
            success: false,
            error: "Seite existiert bereits",
          });
          continue;
        }

        // Hole Inhalt
        const content = await fetchPageContent(page.url);

        if (!content) {
          results.push({
            page,
            success: false,
            error: "Inhalt konnte nicht abgerufen werden",
          });
          continue;
        }

        // Erstelle Page Builder Content
        const pageContent = createPageContent(page.title, content);

        // Erstelle Seite
        const createdPage = await db.page.create({
          data: {
            title: page.title,
            slug: pageSlug,
            published: false, // Standardmäßig nicht veröffentlicht
            contentJson: pageContent,
          },
        });

        results.push({
          page,
          success: true,
        });

        // Kurze Pause zwischen Requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          page,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: PAGES_TO_IMPORT.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    console.error("Fehler beim Importieren der Seiten:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

