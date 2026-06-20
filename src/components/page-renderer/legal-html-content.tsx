"use client";

import { cleanAndConvertHtml } from "@/lib/utils/html-links";

// Erkennt eingebettete dynamische Blöcke (Kurse/Termine etc.) im HTML.
const FHZ_BLOCK_REGEX =
  /<div\s[^>]*data-fhz-block="[^"]+"[^>]*>[\s\S]*?<\/div>/gi;

interface LegalHtmlContentProps {
  html: string;
}

/**
 * Client-sicheres HTML-Rendering für statische Inhalte (z. B. Rechtstexte im
 * Popup). Im Gegensatz zu PageRendererHtml werden KEINE server-only/DB-gestützten
 * Block-Komponenten importiert – dadurch landet kein Server-Code (pg/Prisma) im
 * Browser-Bundle. Eingebettete dynamische Blöcke werden entfernt (für statische
 * Rechtstexte ohnehin nicht relevant); sie werden weiterhin serverseitig über
 * die regulären Seiten gerendert.
 */
export default function LegalHtmlContent({ html }: LegalHtmlContentProps) {
  const trimmed = (html || "").trim();

  if (!trimmed) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  const cleaned = cleanAndConvertHtml(trimmed).replace(FHZ_BLOCK_REGEX, "");

  return (
    <div
      className="tinymce-preview-content prose max-w-none text-md"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}
