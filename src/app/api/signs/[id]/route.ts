import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { signSchema } from "@/lib/validations/signs";
import { slugify } from "@/lib/utils/slug";
import { db } from "@/lib/db";
import { logAudit, getActorFromSession, getChangedFields } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/signs/[id]
 * Einzelnes Zeichen abrufen
 */
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
    const sign = await db.sign.findUnique({
      where: { id },
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
    });

    if (!sign) {
      return NextResponse.json(
        { error: "Zeichen nicht gefunden" },
        { status: 404 }
      );
    }

    // Transformiere für Frontend
    const transformed = {
      ...sign,
      tags: sign.tags.map((st) => st.tag),
    };

    return NextResponse.json(transformed);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching sign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/signs/[id]
 * Zeichen aktualisieren
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getActorFromSession();
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });

    const { id } = await params;
    const body = await request.json();
    const validatedData = signSchema.parse(body);

    // Lade existierendes Zeichen
    const existingSign = await db.sign.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!existingSign) {
      return NextResponse.json(
        { error: "Zeichen nicht gefunden" },
        { status: 404 }
      );
    }

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

    // Lösche alte Tag-Relations
    await db.signTag.deleteMany({
      where: { signId: id },
    });

    // Update Sign
    const updatedSign = await db.sign.update({
      where: { id },
      data: {
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
    const changedFields = getChangedFields(existingSign, updatedSign, [
      "title",
      "description",
      "howTo",
      "tips",
      "videoUrl",
      "imageUrl",
      "status",
    ]);

    await logAudit({
      actor,
      entity: {
        type: "Sign",
        id: updatedSign.id,
        label: updatedSign.title,
      },
      action: AuditAction.UPDATE,
      message: `Zeichen "${updatedSign.title}" aktualisiert`,
      meta: {
        changedFields,
        tags: validatedData.tagNames || [],
      },
    });

    // Transformiere für Frontend
    const transformed = {
      ...updatedSign,
      tags: updatedSign.tags.map((st) => st.tag),
    };

    return NextResponse.json(transformed);
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
    console.error("Error updating sign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/signs/[id]
 * Zeichen löschen (nur ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getActorFromSession();
    await requireRole(["ADMIN"], { throwError: true });

    const { id } = await params;
    const existingSign = await db.sign.findUnique({
      where: { id },
    });

    if (!existingSign) {
      return NextResponse.json(
        { error: "Zeichen nicht gefunden" },
        { status: 404 }
      );
    }

    // Lösche Sign (Cascade löscht SignTag automatisch)
    await db.sign.delete({
      where: { id },
    });

    // Audit Log
    await logAudit({
      actor,
      entity: {
        type: "Sign",
        id: existingSign.id,
        label: existingSign.title,
      },
      action: AuditAction.DELETE,
      message: `Zeichen "${existingSign.title}" gelöscht`,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error deleting sign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



