/**
 * Konvertiert externe Links zu internen Links
 * z.B. https://www.familien-herz-zeit.de/kontakt -> /kontakt
 */
export function convertExternalLinksToInternal(html: string): string {
  // Ersetze Links zu familien-herz-zeit.de mit internen Links
  return html.replace(
    /href=["']https?:\/\/(www\.)?familien-herz-zeit\.de([^"']*)["']/gi,
    (match, www, path) => {
      // Entferne führenden Slash wenn vorhanden, füge dann einen hinzu
      const cleanPath = path || "/";
      return `href="${cleanPath}"`;
    }
  );
}

/**
 * Bereinigt HTML und konvertiert Links
 */
export function cleanAndConvertHtml(html: string): string {
  let cleaned = html;

  // Konvertiere externe Links zu internen
  cleaned = convertExternalLinksToInternal(cleaned);

  // Entferne target="_blank" von internen Links (optional)
  cleaned = cleaned.replace(
    /href=["']([^"']*)["']\s+target=["']_blank["']/gi,
    'href="$1"'
  );

  return cleaned;
}

