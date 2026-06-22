import { NextRequest, NextResponse } from "next/server";
import { cachedPageBySlug } from "@/lib/cache/prisma-cache";
import { parsePageContent, resolveContentKind } from "@/lib/page-builder/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pages/public/:slug
 *
 * Öffentlicher (nicht authentifizierter) Endpunkt, der den Inhalt einer
 * veröffentlichten Seite liefert. Wird verwendet, um Inhalte wie die
 * Datenschutzerklärung oder die Kursbedingungen in einem Popup anzuzeigen,
 * ohne auf eine neue Seite navigieren zu müssen.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await cachedPageBySlug(slug);

    if (!page) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    const contentToRender = page.publishedContentJson ?? page.contentJson;
    if (!contentToRender) {
      return NextResponse.json({ error: "Seite hat keinen Inhalt" }, { status: 404 });
    }

    // P0-d: Content-Form über den einzigen Guard bestimmen. Puck-Daten dürfen NICHT
    // durch parsePageContent laufen (würde leeren Inhalt liefern).
    const kind = resolveContentKind(contentToRender);
    const isV2 = kind === "v2";

    return NextResponse.json({
      title: page.title,
      showTitle: page.showTitle !== false,
      customCss: page.customCss ?? null,
      kind,
      isV2,
      html: isV2 ? (contentToRender as { html: string }).html : null,
      // Puck-Daten roh durchreichen (Rendering via renderPuckTree im Consumer, Phase 1);
      // V1 wird geparst; bei Puck kein parsePageContent.
      puck: kind === "puck" ? contentToRender : null,
      content: kind === "v1" ? parsePageContent(contentToRender) : null,
    });
  } catch (error) {
    console.error("Error fetching public page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
