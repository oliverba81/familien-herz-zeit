import { Block, BlockType } from "./types";
import { PageContentV1 } from "./schema";

/**
 * Generiert eine eindeutige ID für einen Block
 */
export function generateBlockId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback für Server/Node
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Erstellt einen neuen Block mit Default-Daten
 */
export function createBlock(type: BlockType): Block {
  const id = generateBlockId();

  const defaultData: Record<BlockType, Record<string, any>> = {
    hero: {
      heading: "Überschrift",
      subheading: "Untertitel",
      align: "center",
    },
    text: {
      text: "Dein Text hier...",
    },
    richText: {
      html: "<p>Formatierter Text hier...</p>",
    },
    image: {
      src: "",
      alt: "Bild",
      caption: "",
    },
    video: {
      src: "",
      title: "Video",
    },
    features: {
      items: [
        { title: "Feature 1", text: "Beschreibung" },
        { title: "Feature 2", text: "Beschreibung" },
      ],
    },
    testimonials: {
      items: [
        { name: "Name", text: "Testimonial Text" },
      ],
    },
    cta: {
      heading: "Call to Action",
      text: "Beschreibung",
      buttonLabel: "Jetzt starten",
      buttonHref: "/",
    },
    spacer: {
      size: "md",
    },
    table: {
      rows: [
        {
          cells: [
            { blocks: [] },
            { blocks: [] },
          ],
        },
        {
          cells: [
            { blocks: [] },
            { blocks: [] },
          ],
        },
      ],
      columnWidths: ["50%", "50%"], // Default: gleichmäßige Verteilung
    },
    "herzzeit-story": {
      stories: [
        {
          id: generateBlockId(),
          title: "",
          teaser: "",
          readingTime: "",
          audioUrl: "",
          imageUrl: "",
          fullText: "<p></p>",
        },
      ],
      style: "card",
      backgroundColor: undefined,
    },
    courses: {
      title: "",
      category: undefined,
      limit: 6,
    },
    section: {
      title: "",
      children: [],
    },
    reusable: {
      reusableBlockId: "",
    },
    "current-appointments": {
      title: "",
      limit: 5,
    },
    contactForm: {
      title: "",
      emailTo: "",
    },
  };

  return {
    id,
    type,
    data: defaultData[type] || {},
  };
}

/**
 * Erstellt Default PageContent
 */
export function createDefaultContent(): PageContentV1 {
  return {
    version: 1,
    blocks: [
      createBlock("hero"),
      createBlock("text"),
    ],
  };
}

/**
 * Normalisiert altes Format zu neuem Format
 */
export function normalizeContent(content: any): PageContentV1 {
  // Wenn bereits neues Format
  if (content && typeof content === "object" && content.version && Array.isArray(content.blocks)) {
    // Stelle sicher, dass alle Blocks IDs haben
    const normalizedBlocks = content.blocks.map((block: any, index: number) => ({
      ...block,
      id: block.id || `${index}-${block.type}-${Date.now()}`,
    }));
    return {
      version: 1 as const,
      blocks: normalizedBlocks,
    };
  }

  // Altes Format: { blocks: [...] }
  if (content && Array.isArray(content.blocks)) {
    const normalizedBlocks = content.blocks.map((block: any, index: number) => {
      // Wenn Block bereits data hat, nutze es
      if (block.data) {
        return {
          id: block.id || `${index}-${block.type || "unknown"}-${Date.now()}`,
          type: block.type || "text",
          data: block.data,
        };
      }

      // Altes Format: Block hat Eigenschaften direkt
      // Konvertiere zu neuem Format mit data-Objekt
      const blockData: any = {};
      
      // Kopiere alle Eigenschaften außer id, type in data
      Object.keys(block).forEach((key) => {
        if (key !== "id" && key !== "type") {
          blockData[key] = block[key];
        }
      });

      return {
        id: block.id || `${index}-${block.type || "unknown"}-${Date.now()}`,
        type: block.type || "text",
        data: blockData,
      };
    });

    return {
      version: 1,
      blocks: normalizedBlocks,
    };
  }

  // Fallback: Default Content
  return createDefaultContent();
}

