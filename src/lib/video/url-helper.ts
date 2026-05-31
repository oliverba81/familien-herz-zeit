/**
 * Konvertiert eine Video-URL für die Anzeige
 * - Private URLs (private://videos/...) werden zu Preview-Route umgewandelt
 * - Öffentliche URLs bleiben unverändert
 */
export function getVideoDisplayUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Private Video-URL → Preview-Route
  if (url.startsWith("private://videos/")) {
    return `/api/video/preview?url=${encodeURIComponent(url)}`;
  }

  // Öffentliche URLs bleiben unverändert
  return url;
}

