import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { signSchema } from "@/lib/validations/signs";
import { slugify, createUniqueSlug } from "@/lib/utils/slug";
import { db } from "@/lib/db";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/signs
 * Liste aller Zeichen (auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const tag = searchParams.get("tag");

    const where: any = {};

    // Suche
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // Status Filter
    if (status === "DRAFT" || status === "PUBLISHED") {
      where.status = status;
    }

    // Tag Filter
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    const signs = await db.sign.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    // Transformiere für Frontend
    const transformed = signs.map((sign) => ({
      ...sign,
      tags: sign.tags.map((st) => st.tag),
    }));

    return NextResponse.json(transformed);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching signs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/signs
 * Neues Zeichen erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getActorFromSession();
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const body = await request.json();
    const validatedData = signSchema.parse(body);

    // Erstelle eindeutigen Slug
    const baseSlug = slugify(validatedData.title);
    const uniqueSlug = await createUniqueSlug(
      baseSlug,
      async (slug) => {
        const existing = await db.sign.findUnique({ where: { slug } });
        return !existing;
      }
    );

    // Erstelle/Upserte Tags
    const tagIds: string[] = [];
    if (validatedData.tagNames && validatedData.tagNames.length > 0) {
      for (const tagName of validatedData.tagNames) {
        const tagSlug = slugify(tagName);
        const tag = await db.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: {
            slug: tagSlug,
            name: tagName.trim(),
          },
        });
        tagIds.push(tag.id);
      }
    }

    // Erstelle Sign
    const sign = await db.sign.create({
      data: {
        slug: uniqueSlug,
        title: validatedData.title,
        description: validatedData.description,
        howTo: validatedData.howTo || null,
        tips: validatedData.tips || null,
        videoUrl: validatedData.videoUrl || null,
        imageUrl: validatedData.imageUrl || null,
        status: validatedData.status,
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Audit Log
    await logAudit({
      actor,
      entity: {
        type: "Sign",
        id: sign.id,
        label: sign.title,
      },
      action: AuditAction.CREATE,
      message: `Zeichen "${sign.title}" erstellt`,
      meta: {
        status: sign.status,
        tags: validatedData.tagNames || [],
      },
    });

    // Transformiere für Frontend
    const transformed = {
      ...sign,
      tags: sign.tags.map((st) => st.tag),
    };

    return NextResponse.json(transformed, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error creating sign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



