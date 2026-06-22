import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { V2EmbedBlockType } from "@/lib/page-builder/v2-embed-defaults";
import {
  parseHtmlSegments,
  hasEmbeddedBlocks,
} from "@/lib/page-builder/html-segments";
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
