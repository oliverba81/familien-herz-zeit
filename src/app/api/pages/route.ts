import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { pageUpsertSchema } from "@/lib/validations/pages";
import { slugify } from "@/lib/utils/slugify";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { tagPage, tagPages } from "@/lib/seo/tags";

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
    
    console.log("📥 Received body:", JSON.stringify(body, null, 2));

    // Slug automatisch generieren, falls leer
    if (!body.slug && body.title) {
      body.slug = slugify(body.title);
    }

    // Setze published default auf false falls nicht vorhanden
    if (body.published === undefined) {
      body.published = false;
    }

    // Setze showTitle default auf true falls nicht vorhanden oder null
    if (body.showTitle === undefined || body.showTitle === null) {
      body.showTitle = true;
    }
    
    // Stelle sicher, dass showTitle ein Boolean ist
    body.showTitle = Boolean(body.showTitle);

    // Setze containerWidth default auf "medium" falls nicht vorhanden
    if (!body.containerWidth) {
      body.containerWidth = "medium";
    }

    console.log("📝 Body after defaults:", JSON.stringify(body, null, 2));

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
    console.log("📝 Creating page with data:", {
      title: validatedData.title,
      slug: validatedData.slug,
      published: validatedData.published,
      showTitle: validatedData.showTitle,
      showTitleType: typeof validatedData.showTitle,
    });
    
    const page = await db.page.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        published: validatedData.published,
        showTitle: validatedData.showTitle ?? true,
        containerWidth: validatedData.containerWidth ?? "medium",
        customCss: validatedData.customCss || null,
        metaDescription: validatedData.metaDescription ?? null,
        metaKeywords: validatedData.metaKeywords ?? null,
        ogImageUrl: validatedData.ogImageUrl ?? null,
        contentJson: contentJson,
      },
    });

    await logger.success("ADMIN", "PAGE_CREATED", `Page created: ${page.title}`, {
      pageId: page.id,
      slug: page.slug,
      published: page.published,
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Page",
        id: page.id,
        label: page.slug,
      },
      action: AuditAction.CREATE,
      message: `Seite "${page.title}" erstellt`,
      meta: {
        slug: page.slug,
        published: page.published,
      },
    });

    // Revalidate Cache
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPage(page.slug));
    // @ts-ignore - TypeScript type issue with revalidateTag
    revalidateTag(tagPages());

    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error.name === "ZodError") {
      console.error("Zod validation error:", JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("❌ Error creating page:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error.message,
        name: error.name,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

