import {
  V2EmbedBlockType,
  V2_EMBED_BLOCK_TYPES,
  getV2EmbedDefaultData,
  parseEmbedDataFromAttribute,
} from "@/lib/page-builder/v2-embed-defaults";

/**
 * Reine (React-freie) Segmentierung von V2-WYSIWYG-HTML in HTML-Abschnitte und
 * eingebettete Block-Platzhalter (`data-fhz-block`). Geteilt von `PageRendererHtml`
 * (Live-Render) und dem `v2HtmlToPuck`-Migrationsadapter.
 */

const FHZ_BLOCK_REGEX = /<div\s[^>]*data-fhz-block="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi;

export type Segment =
  | { type: "html"; html: string }
  | { type: "block"; blockType: string; blockData: Record<string, unknown> };

export function parseHtmlSegments(html: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FHZ_BLOCK_REGEX.lastIndex = 0;
  while ((match = FHZ_BLOCK_REGEX.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    if (before.trim().length > 0) {
      segments.push({ type: "html", html: before });
    }
    const blockType = match[1].toLowerCase();
    if (V2_EMBED_BLOCK_TYPES.includes(blockType as V2EmbedBlockType)) {
      const fullDiv = match[0];
      const openingTagMatch = fullDiv.match(/^<div\s[^>]*>/);
      const openingTag = openingTagMatch ? openingTagMatch[0] : "";
      const dataAttrMatch = openingTag.match(
        /data-fhz-block-data="((?:[^"]|&quot;|&amp;|&lt;|&gt;)*)"/
      );
      const blockData =
        dataAttrMatch && dataAttrMatch[1]
          ? parseEmbedDataFromAttribute(dataAttrMatch[1]) ??
            getV2EmbedDefaultData(blockType as V2EmbedBlockType)
          : getV2EmbedDefaultData(blockType as V2EmbedBlockType);
      segments.push({ type: "block", blockType, blockData });
    }
    lastIndex = FHZ_BLOCK_REGEX.lastIndex;
  }
  const after = html.slice(lastIndex);
  if (after.trim().length > 0) {
    segments.push({ type: "html", html: after });
  }
  return segments;
}

export function hasEmbeddedBlocks(html: string): boolean {
  return /data-fhz-block=["']/i.test(html);
}
