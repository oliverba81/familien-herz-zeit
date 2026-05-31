import { Block, BlockType, PageContent } from "./types";

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
export function createDefaultContent(): PageContent {
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
export function normalizeContent(content: any): PageContent {
  // Wenn bereits neues Format
  if (content && typeof content === "object" && content.version && Array.isArray(content.blocks)) {
    // Stelle sicher, dass alle Blocks IDs haben
    const normalizedBlocks = content.blocks.map((block: any, index: number) => ({
      ...block,
      id: block.id || `${index}-${block.type}-${Date.now()}`,
    }));
    return {
      version: content.version || 1,
      blocks: normalizedBlocks,
    };
  }

  // Altes Format: { blocks: [...] }
  if (content && Array.isArray(content.blocks)) {
    const normalizedBlocks = content.blocks.map((block: any, index: number) => ({
      id: block.id || `${index}-${block.type || "unknown"}-${Date.now()}`,
      type: block.type || "text",
      data: block.data || block, // Fallback: wenn kein data, nutze block selbst
    }));

    return {
      version: 1,
      blocks: normalizedBlocks,
    };
  }

  // Fallback: Default Content
  return createDefaultContent();
}


