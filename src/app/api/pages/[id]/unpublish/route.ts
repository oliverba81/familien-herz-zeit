import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "@/lib/cache/revalidate";
import { tagPage, tagPages } from "@/lib/seo/tags";

// POST /api/pages/:id/unpublish - Veröffentlichung aufheben
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

    // Setze published auf false (publishedContentJson bleibt erhalten)
    const updatedPage = await db.page.update({
      where: { id },
      data: {
        published: false,
        publishedAt: null,
      },
    });

    await logger.warning(
      "ADMIN",
      "PAGE_UNPUBLISHED",
      `Page unpublished: ${updatedPage.title}`,
      undefined,
      undefined,
      {
        pageId: updatedPage.id,
        slug: updatedPage.slug,
      }
    );

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
      message: `Veröffentlichung von "${updatedPage.title}" aufgehoben`,
      meta: {
        action: "unpublish",
        slug: updatedPage.slug,
      },
    });

    // Revalidate Cache
    revalidateTag(tagPage(updatedPage.slug));
    revalidateTag(tagPages());

    return NextResponse.json({ ok: true, page: updatedPage });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error unpublishing page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



