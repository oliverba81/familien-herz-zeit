import { PageContentV1, createEmptyContent } from "./schema";
import { createBlockId } from "./ids";

/**
 * Migriert altes Format zu V1
 */
export function migrateToV1(input: unknown): PageContentV1 {
  // Wenn bereits V1-Format
  if (
    input &&
    typeof input === "object" &&
    "version" in input &&
    (input as any).version === 1 &&
    Array.isArray((input as any).blocks)
  ) {
    return input as PageContentV1;
  }

  // Altes Format: { blocks: [...] }
  if (
    input &&
    typeof input === "object" &&
    "blocks" in input &&
    Array.isArray((input as any).blocks)
  ) {
    const blocks = (input as any).blocks.map((block: any, index: number) => {
      // Wenn Block bereits data hat, nutze es
      let blockData: any = {};
      if (block.data) {
        blockData = { ...block.data };
      } else {
        // Altes Format: Block hat Eigenschaften direkt
        Object.keys(block).forEach((key) => {
          if (key !== "id" && key !== "type") {
            blockData[key] = block[key];
          }
        });
      }

      // Migration: Image Block - src → media
      if (block.type === "image" && blockData.src && !blockData.media) {
        blockData.media = {
          url: blockData.src,
          alt: blockData.alt || "",
          caption: blockData.caption || "",
        };
        // Alte Felder optional entfernen (für sauberes Format)
        // delete blockData.src; // Behalten für Backward Compatibility
      }

      // Migration: Video Block - src → media
      if (block.type === "video" && blockData.src && !blockData.media) {
        blockData.media = {
          url: blockData.src,
        };
        // Alte Felder optional entfernen
        // delete blockData.src; // Behalten für Backward Compatibility
      }

      // Migration: HerzZeit Story Block - einzelne Felder → stories Array
      if (block.type === "herzzeit-story" && !blockData.stories && (blockData.title || blockData.fullText)) {
        // Altes Format: einzelne Geschichte als direkte Felder
        blockData.stories = [
          {
            id: createBlockId(),
            title: blockData.title || "",
            teaser: blockData.teaser || "",
            readingTime: blockData.readingTime,
            audioUrl: blockData.audioUrl,
            fullText: blockData.fullText || "<p></p>",
          },
        ];
        // Entferne alte Felder (style und backgroundColor bleiben)
        delete blockData.title;
        delete blockData.teaser;
        delete blockData.readingTime;
        delete blockData.audioUrl;
        delete blockData.fullText;
      }

      return {
        id: block.id || createBlockId(),
        type: block.type || "text",
        data: blockData,
      };
    });

    return {
      version: 1,
      blocks,
    };
  }

  // Altes Format: Direktes Array
  if (Array.isArray(input)) {
    const blocks = input.map((block: any, index: number) => {
      let blockData: any = {};
      if (block.data) {
        blockData = { ...block.data };
      } else {
        Object.keys(block).forEach((key) => {
          if (key !== "id" && key !== "type") {
            blockData[key] = block[key];
          }
        });
      }

      // Migration: Image Block - src → media
      if (block.type === "image" && blockData.src && !blockData.media) {
        blockData.media = {
          url: blockData.src,
          alt: blockData.alt || "",
          caption: blockData.caption || "",
        };
      }

      // Migration: Video Block - src → media
      if (block.type === "video" && blockData.src && !blockData.media) {
        blockData.media = {
          url: blockData.src,
        };
      }

      // Migration: HerzZeit Story Block - einzelne Felder → stories Array
      if (block.type === "herzzeit-story" && !blockData.stories && (blockData.title || blockData.fullText)) {
        // Altes Format: einzelne Geschichte als direkte Felder
        blockData.stories = [
          {
            id: createBlockId(),
            title: blockData.title || "",
            teaser: blockData.teaser || "",
            readingTime: blockData.readingTime,
            audioUrl: blockData.audioUrl,
            fullText: blockData.fullText || "<p></p>",
          },
        ];
        // Entferne alte Felder (style und backgroundColor bleiben)
        delete blockData.title;
        delete blockData.teaser;
        delete blockData.readingTime;
        delete blockData.audioUrl;
        delete blockData.fullText;
      }

      return {
        id: block.id || createBlockId(),
        type: block.type || "text",
        data: blockData,
      };
    });

    return {
      version: 1,
      blocks,
    };
  }

  // Fallback: Leerer Content
  return createEmptyContent();
}

