import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { canManageMedia, canDeleteMedia } from "@/lib/auth/policies";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import sharp from "sharp";

export const MAX_EDGE_PX = 1920;
export const WEBP_QUALITY = 85;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media
 * Gibt Medien zurück, optional gefiltert nach Typ (auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleOrThrow(["ADMIN", "EDITOR"]);
    
    if (!canManageMedia(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get("type");

    const where: any = {};
    if (typeParam === "image") {
      where.type = "IMAGE";
    } else if (typeParam === "video") {
      where.type = "VIDEO";
    }

    const media = await db.media.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(media);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Medien:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media
 * Lädt ein Medium hoch (auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleOrThrow(["ADMIN", "EDITOR"]);
    
    if (!canManageMedia(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Bestimme Typ basierend auf MIME-Type
    const mimeType = file.type;
    let mediaType: "IMAGE" | "VIDEO";
    
    if (mimeType.startsWith("image/")) {
      mediaType = "IMAGE";
    } else if (mimeType.startsWith("video/")) {
      mediaType = "VIDEO";
    } else {
      return NextResponse.json(
        { error: "Ungültiger Dateityp. Nur Bilder und Videos sind erlaubt." },
        { status: 400 }
      );
    }

    // Bestimme Upload-Verzeichnis basierend auf Typ
    // Videos: storage/uploads/videos (privat)
    // Images: public/uploads/images (öffentlich, für Website)
    let uploadDir: string;
    let url: string;

    if (mediaType === "VIDEO") {
      // Videos in privaten Ordner
      uploadDir = join(process.cwd(), "storage", "uploads", "videos");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    } else {
      // Images bleiben öffentlich
      uploadDir = join(process.cwd(), "public", "uploads", "images");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    }

    let fileName: string;
    let filePath: string;
    let size: number;
    let mimeTypeToStore: string;

    if (mediaType === "VIDEO") {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split(".").pop();
      fileName = `${timestamp}-${randomString}.${fileExtension}`;
      filePath = join(uploadDir, fileName);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      size = file.size;
      mimeTypeToStore = mimeType;
      url = `private://videos/${fileName}`;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
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
        console.error("Sharp WebP-Konvertierung fehlgeschlagen:", err);
        return NextResponse.json(
          { error: "Bild konnte nicht verarbeitet werden." },
          { status: 400 }
        );
      }
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      fileName = `${timestamp}-${randomString}.webp`;
      filePath = join(uploadDir, fileName);
      await writeFile(filePath, webpBuffer);
      size = webpBuffer.length;
      mimeTypeToStore = "image/webp";
      url = `/api/media/serve/${fileName}`;
    }

    // Speichere in Datenbank (fileName = Originalname für Anzeige)
    const media = await db.media.create({
      data: {
        type: mediaType,
        title: title || null,
        fileName: file.name,
        mimeType: mimeTypeToStore,
        size,
        url,
      },
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Media",
        id: media.id,
        label: media.fileName,
      },
      action: AuditAction.CREATE,
      message: `Medium "${media.fileName}" hochgeladen`,
      meta: {
        type: mediaType,
        mimeType: media.mimeType,
        size: media.size,
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Hochladen des Mediums:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}


