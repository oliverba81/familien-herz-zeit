"use client";

import { truncateAtWordBoundary } from "@/lib/seo/meta";

/**
 * Live-Vorschau (Feature 3): zeigt, wie die Seite als Google-Snippet und als
 * Social-Card (OpenGraph) aussieht. Rein darstellend, aus Titel/Beschreibung/OG-Bild.
 */

const DISPLAY_DOMAIN = "familien-herz-zeit.de";

function truncateTitle(title: string, max = 60): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max).trimEnd()}…`;
}

export interface SeoPreviewProps {
  title: string;
  description: string;
  slug: string;
  ogImageUrl?: string | null;
}

export default function SeoPreview({ title, description, slug, ogImageUrl }: SeoPreviewProps) {
  const displayTitle = truncateTitle(title?.trim() || "Seitentitel");
  const displayDesc =
    truncateAtWordBoundary(description?.trim() || "", 158) ||
    "Noch keine Meta-Beschreibung — wird sonst aus dem Inhalt erzeugt.";
  const path = slug === "home" || !slug ? "" : `/${slug}`;
  const url = `${DISPLAY_DOMAIN}${path}`;

  return (
    <div className="space-y-4">
      {/* Google-Snippet */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Google-Vorschau</p>
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <p className="text-xs text-gray-700">{url}</p>
          <p className="text-[#1a0dab] text-lg leading-tight truncate">{displayTitle}</p>
          <p className="text-sm text-gray-600">{displayDesc}</p>
        </div>
      </div>

      {/* Social-Card (OpenGraph) */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Social-Vorschau</p>
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white max-w-md">
          <div className="aspect-[1200/630] bg-gray-100 flex items-center justify-center">
            {ogImageUrl ? (
               
              <img src={ogImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">Kein OG-Bild (1200×630 empfohlen)</span>
            )}
          </div>
          <div className="p-3">
            <p className="text-xs uppercase text-gray-400">{DISPLAY_DOMAIN}</p>
            <p className="font-semibold text-gray-900 leading-tight truncate">{displayTitle}</p>
            <p className="text-sm text-gray-600 line-clamp-2">{displayDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
