import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { generateToken } from "@/lib/utils/token";

// POST /api/pages/:id/preview-token - Preview Token erstellen/rotieren
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

    // Erzeuge neuen Token (32 Bytes = 43 chars base64url)
    const token = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 Tage Gültigkeit

    // Update Page mit neuem Token
    await db.page.update({
      where: { id },
      data: {
        previewToken: token,
        previewTokenExpires: expiresAt,
      },
    });

    await logger.success("ADMIN", "PAGE_PREVIEW_TOKEN_CREATED", `Preview token created for: ${page.title}`, {
      pageId: page.id,
      slug: page.slug,
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
      action: AuditAction.OTHER,
      message: `Preview Token für "${page.title}" erstellt/rotiert`,
      meta: {
        action: "preview_token_rotated",
        slug: page.slug,
      },
    });

    return NextResponse.json({ token });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error creating preview token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



