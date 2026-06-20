import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { tagPage, tagPages } from "@/lib/seo/tags";
import { parsePageContent, isPageContentV2 } from "@/lib/page-builder/schema";

// POST /api/pages/:id/publish - Seite veröffentlichen
export async function POST(
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

    // Lade Page
    const page = await db.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    // Hole Draft Content (mit Fallback auf contentJson für Backward Compatibility)
    const draftContent = page.draftContentJson ?? page.contentJson;

    if (!draftContent) {
      return NextResponse.json(
        { error: "Kein Entwurf zum Veröffentlichen vorhanden" },
        { status: 400 }
      );
    }

    // Validiere Content (V1 oder V2)
    if (!isPageContentV2(draftContent)) {
      try {
        parsePageContent(draftContent);
      } catch (e: any) {
        return NextResponse.json(
          { error: "Ungültiges Content-Format", details: e.message },
          { status: 400 }
        );
      }
    }

    // Veröffentliche: Kopiere Draft → Published
    const updatedPage = await db.page.update({
      where: { id },
      data: {
        publishedContentJson: draftContent,
        published: true,
        publishedAt: new Date(),
      },
    });

    await logger.success("ADMIN", "PAGE_PUBLISHED", `Page published: ${updatedPage.title}`, {
      pageId: updatedPage.id,
      slug: updatedPage.slug,
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Page",
        id: updatedPage.id,
        label: updatedPage.slug,
      },
      action: AuditAction.STATUS_CHANGE,
      message: `Seite "${updatedPage.title}" veröffentlicht`,
      meta: {
        action: "publish",
        slug: updatedPage.slug,
      },
    });

    // Revalidate Cache
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPage(updatedPage.slug));
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPages());

    return NextResponse.json({ ok: true, page: updatedPage });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error publishing page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



