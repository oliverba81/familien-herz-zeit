import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "images");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * GET /api/media/serve/[...path]
 * Liefert hochgeladene Bilder aus public/uploads/images aus.
 * Wird per Rewrite auch für /uploads/images/:path* verwendet, damit
 * Upload-URLs auch hinter Reverse-Proxies zuverlässig funktionieren.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: "Dateiname fehlt" }, { status: 400 });
    }

    // Nur den letzten Segment als Dateinamen verwenden (Path-Traversal verhindern)
    const fileName = pathSegments[pathSegments.length - 1];
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitized !== fileName) {
      return NextResponse.json({ error: "Ungültiger Dateiname" }, { status: 400 });
    }

    const filePath = join(UPLOAD_DIR, sanitized);
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
    }

    let resolvedPath = filePath;
    if (!existsSync(filePath)) {
      // Fallback: konvertierte WebP-Version ausliefern (alte URL in Seiteninhalten)
      const ext = sanitized.includes(".")
        ? "." + sanitized.split(".").pop()?.toLowerCase()
        : "";
      if (/\.(jpe?g|png|gif)$/i.test(sanitized)) {
        const fallbackFileName = sanitized.replace(/\.(jpe?g|png|gif)$/i, ".webp");
        const fallbackPath = join(UPLOAD_DIR, fallbackFileName);
        if (fallbackPath.startsWith(UPLOAD_DIR) && existsSync(fallbackPath)) {
          resolvedPath = fallbackPath;
        }
      }
      if (!existsSync(resolvedPath)) {
        return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
      }
    }

    const servedFileName = resolvedPath.split(/[/\\]/).pop() ?? "";
    const ext = servedFileName.includes(".")
      ? "." + servedFileName.split(".").pop()?.toLowerCase()
      : "";
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    const buffer = await readFile(resolvedPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[media/serve]", err);
    return NextResponse.json(
      { error: "Fehler beim Ausliefern der Datei" },
      { status: 500 }
    );
  }
}
