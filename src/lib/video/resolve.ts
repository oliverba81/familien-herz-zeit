import { join } from "path";
import { basename } from "path";

/**
 * Löst eine Media-URL zu einem sicheren Dateipfad auf
 * Unterstützt:
 * - private://videos/<fileName> → storage/uploads/videos/<fileName>
 * - /uploads/videos/<fileName> → public/uploads/videos/<fileName> (Fallback für alte URLs)
 */
export function resolveVideoPathFromMediaUrl(url: string): {
  filePath: string;
  mimeType?: string;
} {
  // Sicherheitsprüfung: Keine Path-Traversal-Angriffe
  const sanitizeFileName = (fileName: string): string => {
    // Entferne alle gefährlichen Zeichen
    const sanitized = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitized !== basename(fileName)) {
      throw new Error("Ungültiger Dateiname");
    }
    return sanitized;
  };

  // Private URL-Schema: private://videos/<fileName>
  if (url.startsWith("private://videos/")) {
    const fileName = url.replace("private://videos/", "");
    const sanitized = sanitizeFileName(fileName);
    const filePath = join(process.cwd(), "storage", "uploads", "videos", sanitized);
    return { filePath };
  }

  // Alte öffentliche URL: /uploads/videos/<fileName>
  if (url.startsWith("/uploads/videos/")) {
    const fileName = url.replace("/uploads/videos/", "");
    const sanitized = sanitizeFileName(fileName);
    const filePath = join(process.cwd(), "public", "uploads", "videos", sanitized);
    return { filePath };
  }

  // Fallback: Versuche als Dateiname zu behandeln (für Migration)
  if (!url.includes("/") && !url.includes("\\")) {
    const sanitized = sanitizeFileName(url);
    // Versuche zuerst im privaten Ordner
    const privatePath = join(process.cwd(), "storage", "uploads", "videos", sanitized);
    return { filePath: privatePath };
  }

  throw new Error(`Ungültige Video-URL: ${url}`);
}

