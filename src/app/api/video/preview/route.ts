import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { resolveVideoPathFromMediaUrl } from "@/lib/video/resolve";
import { stat, createReadStream } from "fs";
import { promisify } from "util";
import { Readable } from "stream";

const statAsync = promisify(stat);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/video/preview?url=...
 * Streamt ein Video für Admin-Previews (nur für ADMIN/EDITOR)
 * Unterstützt Range-Requests für Scrubbing
 */
export async function GET(request: NextRequest) {
  try {
    // Nur für Admins/Editoren
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL fehlt" },
        { status: 400 }
      );
    }

    // Video-Pfad auflösen
    let filePath: string;
    try {
      const resolved = resolveVideoPathFromMediaUrl(url);
      filePath = resolved.filePath;
    } catch (error: any) {
      console.error("[VideoPreview] Fehler beim Auflösen des Video-Pfads:", error);
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
      console.error("[VideoPreview] Datei nicht gefunden:", filePath);
      return NextResponse.json(
        { error: "Video-Datei nicht gefunden" },
        { status: 404 }
      );
    }

    const fileSize = fileStats.size;
    const range = request.headers.get("range");

    // MIME-Type bestimmen (Fallback: video/mp4)
    const mimeType = "video/mp4";

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
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("[VideoPreview] Fehler:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

