import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveVideoPathFromMediaUrl } from "@/lib/video/resolve";
import { stat, createReadStream } from "fs";
import { promisify } from "util";
import { Readable } from "stream";
import { logger } from "@/lib/logging/logger";

const statAsync = promisify(stat);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/video/stream?token=...
 * Streamt ein Video mit Range-Support und Token-Validierung
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token fehlt" },
        { status: 400 }
      );
    }

    // Token laden und validieren
    const accessToken = await db.videoAccessToken.findUnique({
      where: { token },
      include: { videoCourse: true },
    });

    if (!accessToken) {
      await logger.warning(
        "VIDEO",
        "VIDEO_ACCESS_DENIED",
        `Invalid token attempt`,
        undefined,
        undefined,
        {
          reason: "Token not found",
          tokenPrefix: token.substring(0, 8) + "...",
        }
      );
      return NextResponse.json(
        { error: "Ungültiger Token" },
        { status: 404 }
      );
    }

    // Token-Validierung
    const now = new Date();
    if (accessToken.revokedAt) {
      await logger.warning(
        "VIDEO",
        "VIDEO_ACCESS_DENIED",
        `Token revoked`,
        undefined,
        undefined,
        {
          tokenId: accessToken.id,
          videoCourseId: accessToken.videoCourseId,
        }
      );
      return NextResponse.json(
        { error: "Token wurde widerrufen" },
        { status: 404 }
      );
    }

    if (accessToken.expiresAt <= now) {
      await logger.warning(
        "VIDEO",
        "VIDEO_ACCESS_DENIED",
        `Token expired`,
        undefined,
        undefined,
        {
          tokenId: accessToken.id,
          videoCourseId: accessToken.videoCourseId,
          expiresAt: accessToken.expiresAt.toISOString(),
        }
      );
      return NextResponse.json(
        { error: "Token ist abgelaufen" },
        { status: 404 }
      );
    }

    if (accessToken.videoCourse.status !== "PUBLISHED") {
      await logger.warning(
        "VIDEO",
        "VIDEO_ACCESS_DENIED",
        `Course not published`,
        undefined,
        undefined,
        {
          tokenId: accessToken.id,
          videoCourseId: accessToken.videoCourseId,
          courseStatus: accessToken.videoCourse.status,
        }
      );
      return NextResponse.json(
        { error: "Videokurs ist nicht verfügbar" },
        { status: 404 }
      );
    }

    // Video-Pfad auflösen
    const videoUrl = accessToken.videoCourse.videoUrl;
    let filePath: string;
    try {
      const resolved = resolveVideoPathFromMediaUrl(videoUrl);
      filePath = resolved.filePath;
    } catch (error: any) {
      console.error("[VideoStream] Fehler beim Auflösen des Video-Pfads:", error);
      return NextResponse.json(
        { error: "Video-Datei nicht gefunden" },
        { status: 404 }
      );
    }

    // Datei-Statistiken abrufen
    let fileStats;
    try {
      fileStats = await statAsync(filePath);
    } catch (error: any) {
      console.error("[VideoStream] Datei nicht gefunden:", filePath);
      return NextResponse.json(
        { error: "Video-Datei nicht gefunden" },
        { status: 404 }
      );
    }

    const fileSize = fileStats.size;
    const range = request.headers.get("range");

    // MIME-Type bestimmen (Fallback: video/mp4)
    const mimeType = "video/mp4"; // Könnte aus filePath-Erweiterung bestimmt werden

    // Range-Request verarbeiten
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validierung
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const stream = createReadStream(filePath, { start, end });

      // Node.js Stream zu Web Stream konvertieren
      const webStream = Readable.toWeb(stream as any) as ReadableStream;

      // Log erfolgreichen Stream (nur einmal pro Request, nicht bei jedem Range-Request)
      if (start === 0) {
        await logger.info("VIDEO", "VIDEO_STREAMED", `Video streamed for token`, {
          tokenId: accessToken.id,
          videoCourseId: accessToken.videoCourseId,
          videoCourseTitle: accessToken.videoCourse.title,
        });
      }

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
        },
      });
    } else {
      // Vollständige Datei streamen
      const stream = createReadStream(filePath);
      const webStream = Readable.toWeb(stream as any) as ReadableStream;

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
        },
      });
    }
  } catch (error: any) {
    console.error("[VideoStream] Fehler:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

