/**
 * SEO Helper Functions
 */

import { isPageContentPuck } from "@/lib/page-builder/schema";

/** Prop-Schlüssel, die in Puck-Komponenten lesbaren Text tragen. */
const PUCK_TEXT_KEYS = new Set([
  "heading",
  "subheading",
  "title",
  "subtitle",
  "text",
  "teaser",
  "fullText",
  "html",
  "caption",
  "buttonText",
  "label",
]);

/**
 * Sammelt rekursiv Text aus einem Puck-Datenbaum (root + content + inline Slot-Props).
 * Unabhängig von `@puckeditor/core` — läuft direkt über die JSON-Struktur.
 */
function collectPuckText(node: unknown, parts: string[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const child of node) collectPuckText(child, parts);
    return;
  }
  if (typeof node !== "object") return;
  for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
    if (typeof val === "string") {
      if (PUCK_TEXT_KEYS.has(key)) {
        const text = (key === "html" ? val.replace(/<[^>]+>/g, " ") : val)
          .replace(/\s+/g, " ")
          .trim();
        if (text) parts.push(text);
      }
    } else {
      collectPuckText(val, parts);
    }
  }
}

/** Extrahiert zusammenhängenden Text aus Puck-Daten (V3) bis maxLength. */
export function extractTextFromPuck(data: unknown, maxLength: number): string {
  const parts: string[] = [];
  collectPuckText(data, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/**
 * Gibt die Base URL der App zurück
 */
export function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NODE_ENV === "production"
    ? "https://familien-herz-zeit.de"
    : "http://localhost:3000";
}

/**
 * Erstellt eine absolute URL aus einem relativen Pfad
 */
export function absoluteUrl(path: string): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export interface OpenGraphData {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  type?: "website" | "article";
}

/**
 * Erstellt OpenGraph Metadata
 */
export function buildOpenGraph(data: OpenGraphData) {
  const og: any = {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "Familien Herz Zeit",
    type: data.type || "website",
    locale: "de_DE",
  };

  if (data.imageUrl) {
    og.images = [
      {
        url: absoluteUrl(data.imageUrl),
        width: 1200,
        height: 630,
        alt: data.title,
      },
    ];
  }

  return {
    openGraph: og,
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
      images: data.imageUrl ? [absoluteUrl(data.imageUrl)] : undefined,
    },
  };
}

/**
 * Extrahiert Text aus einem Content-JSON (für Description)
 */
export function extractTextFromContent(contentJson: any, maxLength: number = 160): string {
  if (!contentJson) return "";

  if (typeof contentJson === "string") {
    try {
      contentJson = JSON.parse(contentJson);
    } catch {
      return contentJson.substring(0, maxLength);
    }
  }

  // V3 Puck Content
  if (isPageContentPuck(contentJson)) {
    return extractTextFromPuck(contentJson, maxLength);
  }

  // V2 Page Content (WYSIWYG HTML)
  if (
    contentJson &&
    typeof contentJson === "object" &&
    contentJson.version === 2 &&
    typeof contentJson.html === "string"
  ) {
    const text = contentJson.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.substring(0, maxLength);
  }

  if (Array.isArray(contentJson)) {
    for (const block of contentJson) {
      if (block.type === "paragraph" && block.children) {
        for (const child of block.children) {
          if (child.text) {
            const text = child.text.trim();
            if (text.length > 0) {
              return text.substring(0, maxLength);
            }
          }
        }
      }
    }
  }

  return "";
}

const DESCRIPTION_MAX_LENGTH = 158;

/**
 * Kürzt einen Text an der letzten Wortgrenze vor maxLength (für Meta-Description).
 */
export function truncateAtWordBoundary(text: string, maxLength: number = DESCRIPTION_MAX_LENGTH): string {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    return truncated.slice(0, lastSpace).trim();
  }
  return truncated.trim();
}

/**
 * Extrahiert Text aus Page-Content für KI-Kontext (V1 oder V2), bis maxLength Zeichen.
 */
export function extractTextFromContentForAI(contentJson: any, maxLength: number = 3000): string {
  if (!contentJson) return "";

  if (typeof contentJson === "string") {
    try {
      contentJson = JSON.parse(contentJson);
    } catch {
      return contentJson.replace(/\s+/g, " ").trim().slice(0, maxLength);
    }
  }

  // V3 Puck Content
  if (isPageContentPuck(contentJson)) {
    return extractTextFromPuck(contentJson, maxLength);
  }

  // V2 Page Content (WYSIWYG HTML)
  if (
    contentJson &&
    typeof contentJson === "object" &&
    contentJson.version === 2 &&
    typeof contentJson.html === "string"
  ) {
    const text = contentJson.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, maxLength);
  }

  // V1 Page Content: { version: 1, blocks: [...] }, block.data mit heading, subheading, text etc.
  if (
    contentJson &&
    typeof contentJson === "object" &&
    contentJson.version === 1 &&
    Array.isArray(contentJson.blocks)
  ) {
    const parts: string[] = [];
    for (const block of contentJson.blocks) {
      const data = block?.data;
      if (!data || typeof data !== "object") continue;
      if (typeof data.heading === "string" && data.heading.trim()) parts.push(data.heading.trim());
      if (typeof data.subheading === "string" && data.subheading.trim()) parts.push(data.subheading.trim());
      if (typeof data.text === "string" && data.text.trim()) parts.push(data.text.trim());
      if (data.children && Array.isArray(data.children)) {
        for (const child of data.children) {
          if (child?.text && typeof child.text === "string" && child.text.trim()) {
            parts.push(child.text.trim());
          }
        }
      }
    }
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    return text.slice(0, maxLength);
  }

  return "";
}




