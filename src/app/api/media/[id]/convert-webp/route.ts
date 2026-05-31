import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageMedia } from "@/lib/auth/policies";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import sharp from "sharp";
import { MAX_EDGE_PX, WEBP_QUALITY } from "../../route";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "images");

const CONVERTIBLE_EXT = /\.(jpe?g|png|gif)$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/media/[id]/convert-webp
 * Konvertiert ein bestehendes Bild (JPEG/PNG/GIF) nach WebP.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRoleOrThrow(["ADMIN", "EDITOR"]);
    if (!canManageMedia(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const media = await db.media.findUnique({ where: { id } });

    if (!media) {
      return NextResponse.json(
        { error: "Medium nicht gefunden" },
        { status: 404 }
      );
    }

    if (media.type !== "IMAGE") {
      return NextResponse.json(
        { error: "Nur Bilder können in WebP umgewandelt werden." },
        { status: 400 }
      );
    }

    if (media.mimeType === "image/webp") {
      return NextResponse.json(
        { error: "Bild ist bereits im WebP-Format." },
        { status: 400 }
      );
    }

    // Dateiname aus URL oder Fallback Anzeigename (fileName), damit auch abweichend gespeicherte URLs funktionieren
    let fileName = "";
    if (media.url.startsWith("/api/media/serve/")) {
      fileName = media.url.replace(/^\/api\/media\/serve\//, "").trim();
    } else if (media.url.includes("/api/media/serve/")) {
      const part = media.url.split("/api/media/serve/")[1];
      fileName = (part?.split("?")[0] ?? "").trim();
    }
    if (!fileName) {
      fileName = (media.fileName ?? "").trim();
    }
    if (!fileName) {
      return NextResponse.json(
        { error: "Dateiname konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitized !== fileName) {
      return NextResponse.json(
        { error: "Ungültiger Dateiname" },
        { status: 400 }
      );
    }

    // Konvertierung nur bei bekannter Bild-Endung (sonst z.B. .webp würde doppelt werden)
    if (!CONVERTIBLE_EXT.test(sanitized)) {
      return NextResponse.json(
        { error: "Nur Dateien mit Endung .jpg, .jpeg, .png oder .gif können umgewandelt werden." },
        { status: 400 }
      );
    }

    const oldPath = join(UPLOAD_DIR, sanitized);
    if (!oldPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
    }

    if (!existsSync(oldPath)) {
      return NextResponse.json(
        { error: "Quelldatei nicht gefunden" },
        { status: 404 }
      );
    }

    const newFileName = sanitized.replace(CONVERTIBLE_EXT, ".webp");
    const newPath = join(UPLOAD_DIR, newFileName);
    if (!newPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
    }

    const buffer = await readFile(oldPath);
    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(buffer)
        .resize(MAX_EDGE_PX, MAX_EDGE_PX, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (err) {
      console.error("[convert-webp] Sharp fehlgeschlagen:", err);
      return NextResponse.json(
        { error: "Bild konnte nicht in WebP umgewandelt werden." },
        { status: 500 }
      );
    }

    await writeFile(newPath, webpBuffer);

    const newUrl = `/api/media/serve/${newFileName}`;
    const updated = await db.media.update({
      where: { id },
      data: {
        url: newUrl,
        mimeType: "image/webp",
        size: webpBuffer.length,
        fileName: newFileName,
      },
    });

    try {
      await unlink(oldPath);
    } catch (unlinkErr) {
      console.error("[convert-webp] Alte Datei konnte nicht gelöscht werden:", unlinkErr);
      // DB zeigt bereits auf WebP; alte Datei bleibt als Orphan
    }

    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Media",
        id: media.id,
        label: updated.fileName,
      },
      action: AuditAction.UPDATE,
      message: `Medium "${media.fileName}" in WebP umgewandelt`,
      meta: {
        oldFileName: media.fileName,
        newFileName: updated.fileName,
        newSize: updated.size,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    const err = error as { message?: string };
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json(
        { error: err.message },
        { status: err.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("[convert-webp]", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
