import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import {
  V2EmbedBlockType,
  V2_EMBED_BLOCK_TYPES,
  getV2EmbedDefaultData,
  parseEmbedDataFromAttribute,
} from "@/lib/page-builder/v2-embed-defaults";
import CoursesBlock from "@/components/courses/courses-block";
import CurrentAppointmentsBlock from "@/components/courses/current-appointments-block";
import HerzZeitStoryBlock from "@/components/stories/herzzeit-story-block";
import ContactFormBlock from "./contact-form-block";
import type {
  CoursesBlockData,
  CurrentAppointmentsBlockData,
  HerzZeitStoryBlockData,
  ContactFormBlockData,
} from "@/lib/page-builder/types";

const FHZ_BLOCK_REGEX =
  /<div\s[^>]*data-fhz-block="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi;

type Segment =
  | { type: "html"; html: string }
  | { type: "block"; blockType: string; blockData: Record<string, unknown> };

function parseHtmlSegments(html: string): Segment[] {
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
          ? parseEmbedDataFromAttribute(dataAttrMatch[1]) ?? getV2EmbedDefaultData(blockType as V2EmbedBlockType)
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

function hasEmbeddedBlocks(html: string): boolean {
  return /data-fhz-block=["']/i.test(html);
}

interface PageRendererHtmlProps {
  html: string;
}

export default function PageRendererHtml({ html }: PageRendererHtmlProps) {
  const trimmed = html.trim();
  if (!trimmed) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  const cleaned = cleanAndConvertHtml(trimmed);

  if (!hasEmbeddedBlocks(cleaned)) {
    return (
      <div
        className="tinymce-preview-content prose max-w-none text-md"
        dangerouslySetInnerHTML={{ __html: cleaned }}
      />
    );
  }

  const segments = parseHtmlSegments(cleaned);
  return (
    <div className="space-y-6">
      {segments.map((seg, i) => {
        if (seg.type === "html") {
          return (
            <div
              key={`html-${i}`}
              className="tinymce-preview-content prose max-w-none text-md"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        const blockType = seg.blockType as V2EmbedBlockType;
        const blockData = seg.blockData;
        switch (blockType) {
          case "courses":
            return (
              <div key={`block-${i}-${blockType}`}>
                <CoursesBlock data={blockData as unknown as CoursesBlockData} />
              </div>
            );
          case "current-appointments":
            return (
              <div key={`block-${i}-${blockType}`}>
                <CurrentAppointmentsBlock
                  data={blockData as unknown as CurrentAppointmentsBlockData}
                />
              </div>
            );
          case "herzzeit-story":
            return (
              <div key={`block-${i}-${blockType}`}>
                <HerzZeitStoryBlock
                  data={blockData as unknown as HerzZeitStoryBlockData}
                />
              </div>
            );
          case "contactForm":
            return (
              <div key={`block-${i}-${blockType}`}>
                <ContactFormBlock
                  data={blockData as unknown as ContactFormBlockData}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
