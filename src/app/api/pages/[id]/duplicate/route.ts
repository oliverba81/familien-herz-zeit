import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { tagPage, tagPages } from "@/lib/seo/tags";
import { slugify } from "@/lib/utils/slugify";
import { createUniqueSlug } from "@/lib/utils/slug";
import { createEmptyContent } from "@/lib/page-builder/schema";

/**
 * POST /api/pages/:id/duplicate
 * Erstellt eine Kopie der Seite inkl. Inhalt (Page Builder V1 oder V2).
 * Kopie wird als Entwurf (published: false) erstellt.
 */
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

    const page = await db.page.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        contentJson: true,
        draftContentJson: true,
        publishedContentJson: true,
        showTitle: true,
        containerWidth: true,
        customCss: true,
        metaDescription: true,
        metaKeywords: true,
        ogImageUrl: true,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Seite nicht gefunden" },
        { status: 404 }
      );
    }

    const effective =
      page.draftContentJson ?? page.contentJson ?? undefined;
    const contentForCopy =
      effective != null
        ? (JSON.parse(JSON.stringify(effective)) as object)
        : createEmptyContent();

    const newTitle = `${page.title} (Kopie)`;
    const baseSlug = slugify(newTitle);
    const uniqueSlug = await createUniqueSlug(
      baseSlug,
      async (slug) => !(await db.page.findUnique({ where: { slug } }))
    );

    const newPage = await db.page.create({
      data: {
        title: newTitle,
        slug: uniqueSlug,
        published: false,
        showTitle: page.showTitle ?? true,
        containerWidth: page.containerWidth ?? "medium",
        customCss: page.customCss ?? null,
        metaDescription: page.metaDescription ?? null,
        metaKeywords: page.metaKeywords ?? null,
        ogImageUrl: page.ogImageUrl ?? null,
        contentJson: contentForCopy,
        draftContentJson: contentForCopy,
        publishedContentJson: Prisma.JsonNull,
      },
    });

    await logger.success(
      "ADMIN",
      "PAGE_DUPLICATED",
      `Page duplicated: ${newPage.title}`,
      {
        pageId: newPage.id,
        slug: newPage.slug,
        sourcePageId: page.id,
      }
    );

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Page",
        id: newPage.id,
        label: newPage.slug,
      },
      action: AuditAction.CREATE,
      message: `Seite "${newPage.title}" als Kopie erstellt`,
      meta: {
        slug: newPage.slug,
        published: newPage.published,
        sourcePageId: page.id,
      },
    });

    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPage(newPage.slug));
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPages());

    return NextResponse.json(newPage, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: error.message as string },
        {
          status: (error as { message: string }).message === "Unauthorized"
            ? 401
            : 403,
        }
      );
    }
    console.error("Error duplicating page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
