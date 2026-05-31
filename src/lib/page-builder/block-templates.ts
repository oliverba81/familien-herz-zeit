import { Block, BlockType } from "./types";
import { createBlockId } from "./ids";
import { createBlockFromRegistry } from "./registry";

export interface BlockTemplate {
  id: string;
  label: string;
  description?: string;
  icon: string;
  blocksFactory: () => Block[];
}

/**
 * Block Templates Registry
 */
export const blockTemplates: BlockTemplate[] = [
  {
    id: "hero-features-cta",
    label: "Startseite Hero",
    description: "Hero + Features + CTA",
    icon: "🎯",
    blocksFactory: () => [
      createBlockFromRegistry("hero"),
      createBlockFromRegistry("features"),
      createBlockFromRegistry("cta"),
    ],
  },
  {
    id: "testimonials-cta",
    label: "Social Proof",
    description: "Testimonials + CTA",
    icon: "💬",
    blocksFactory: () => [
      createBlockFromRegistry("testimonials"),
      createBlockFromRegistry("cta"),
    ],
  },
  {
    id: "info-section",
    label: "Info Section",
    description: "Text + Bild in Section",
    icon: "📦",
    blocksFactory: () => {
      const sectionBlock: Block = {
        id: createBlockId(),
        type: "section",
        data: {
          title: "Info Section",
          layout: "default",
          background: "soft",
          padding: "md",
          children: [
            createBlockFromRegistry("text"),
            createBlockFromRegistry("image"),
          ],
        },
      };
      return [sectionBlock];
    },
  },
  {
    id: "hero-cta",
    label: "Hero + CTA",
    description: "Einfaches Hero mit Call-to-Action",
    icon: "🚀",
    blocksFactory: () => [
      createBlockFromRegistry("hero"),
      createBlockFromRegistry("cta"),
    ],
  },
];

/**
 * Gibt Template nach ID zurück
 */
export function getTemplateById(id: string): BlockTemplate | undefined {
  return blockTemplates.find((t) => t.id === id);
}

/**
 * Gibt alle Templates zurück
 */
export function getAllTemplates(): BlockTemplate[] {
  return blockTemplates;
}



