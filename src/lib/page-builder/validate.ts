import { z } from "zod";
import { BlockType, Block } from "./types";
import { PageContentV1 } from "./schema";
import { blockRegistry } from "./registry";
import { blockTypeSchema } from "./schema";

// Normalisierung entfernt - Schema akzeptiert jetzt direkt leere Strings

const blockSchema = z.object({
  id: z.string().min(1),
  type: blockTypeSchema,
  data: z.record(z.string(), z.any()),
});

export const pageContentSchema = z.object({
  version: z.number().int().positive(),
  blocks: z.array(blockSchema),
});

export type ValidatedPageContent = z.infer<typeof pageContentSchema>;

export interface ValidationError {
  path: string;
  message: string;
  blockId?: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validiert PageContent (legacy, für Backward Compatibility)
 */
export function validatePageContent(content: any): {
  success: boolean;
  data?: ValidatedPageContent;
  error?: string;
} {
  try {
    const validated = pageContentSchema.parse(content);
    return { success: true, data: validated };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validierungsfehler: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { success: false, error: "Ungültiges Format" };
  }
}

/**
 * Validiert Content mit block-spezifischen Schemas und gibt errors/warnings zurück
 */
export function validateContent(
  content: PageContentV1,
  opts?: { mode?: "draft" | "publish" }
): ValidationResult {
  const mode = opts?.mode || "draft";
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!content || !Array.isArray(content.blocks)) {
    errors.push({
      path: "content",
      message: "Content ist ungültig oder hat keine blocks",
    });
    return { errors, warnings };
  }

  content.blocks.forEach((block, index) => {
    const blockPath = `blocks[${index}]`;
    const blockId = block.id || `block-${index}`;

    // Prüfe ob Block Type bekannt ist
    if (!blockTypeSchema.safeParse(block.type).success) {
      errors.push({
        path: `${blockPath}.type`,
        message: `Unbekannter Block-Typ: ${block.type}`,
        blockId,
      });
      return;
    }

    const registryEntry = blockRegistry[block.type as BlockType];
    if (!registryEntry) {
      errors.push({
        path: `${blockPath}.type`,
        message: `Block-Typ nicht in Registry: ${block.type}`,
        blockId,
      });
      return;
    }

    // Validiere Block Data mit Schema
    try {
      // Für herzzeit-story Blöcke: Überspringe Validierung für audioUrl und imageUrl komplett
      // da diese Felder nur über Upload/Mediathek gesetzt werden und keine URL-Validierung benötigen
      if (block.type === "herzzeit-story") {
        // Validiere nur die anderen Felder, nicht audioUrl und imageUrl
        const storiesWithoutUrls = (block.data.stories || []).map((story: any) => {
          const { audioUrl: _, imageUrl: __, ...restStory } = story;
          return restStory;
        });
        const dataToValidate = {
          ...block.data,
          stories: storiesWithoutUrls,
        };
        // Erstelle ein temporäres Schema ohne audioUrl und imageUrl
        const storyItemSchemaWithoutUrls = z.object({
          id: z.string().min(1),
          title: z.string().min(1, "Titel ist erforderlich"),
          teaser: z.string().min(1, "Teaser ist erforderlich"),
          readingTime: z.string().optional(),
          fullText: z.string().min(1, "Volltext ist erforderlich"),
        });
        const blockSchemaWithoutUrls = z.object({
          title: z.string().optional(),
          stories: z.array(storyItemSchemaWithoutUrls).min(1, "Mindestens eine Geschichte ist erforderlich"),
          style: z.enum(["card", "banner", "minimal"]).optional().default("card"),
          backgroundColor: z.string().optional(),
        });
        blockSchemaWithoutUrls.parse(dataToValidate);
      } else {
        registryEntry.schema.parse(block.data);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((issue) => {
          const errorObj: ValidationError = {
            path: `${blockPath}.data.${issue.path.join(".")}`,
            message: issue.message,
            blockId,
          };
          errors.push(errorObj);
        });
      }
    }

    // Mode-spezifische Validierung
    if (mode === "publish") {
      // Publish: Stricter
      if (block.type === "hero") {
        const heading = (block.data as any)?.heading;
        if (!heading || heading.trim() === "") {
          errors.push({
            path: `${blockPath}.data.heading`,
            message: "Hero Überschrift ist für Veröffentlichung erforderlich",
            blockId,
          });
        }
      }

      if (block.type === "image") {
        const media = (block.data as any)?.media;
        const url = media?.url || (block.data as any)?.src;
        const alt = media?.alt || (block.data as any)?.alt;
        if (url && (!alt || alt.trim() === "")) {
          errors.push({
            path: `${blockPath}.data.media.alt`,
            message: "Alt-Text ist für veröffentlichte Bilder erforderlich",
            blockId,
          });
        }
      }
    } else {
      // Draft: Warnings
      if (block.type === "hero") {
        const heading = (block.data as any)?.heading;
        if (!heading || heading.trim() === "") {
          warnings.push({
            path: `${blockPath}.data.heading`,
            message: "Hero Überschrift ist leer",
            blockId,
          });
        }
      }

      if (block.type === "image") {
        const media = (block.data as any)?.media;
        const url = media?.url || (block.data as any)?.src;
        const alt = media?.alt || (block.data as any)?.alt;
        if (url && (!alt || alt.trim() === "")) {
          warnings.push({
            path: `${blockPath}.data.media.alt`,
            message: "Bild hat keinen Alt-Text",
            blockId,
          });
        }
      }
    }

    // Rekursive Validierung für Sections
    if (block.type === "section") {
      const children = (block.data as any)?.children || [];
      if (Array.isArray(children)) {
        children.forEach((child: Block, childIndex: number) => {
          const childPath = `${blockPath}.data.children[${childIndex}]`;
          const childId = child.id || `child-${childIndex}`;

          if (!blockTypeSchema.safeParse(child.type).success) {
            errors.push({
              path: `${childPath}.type`,
              message: `Unbekannter Block-Typ in Section: ${child.type}`,
              blockId: childId,
            });
            return;
          }

          const childRegistryEntry = blockRegistry[child.type as BlockType];
          if (childRegistryEntry) {
            try {
              childRegistryEntry.schema.parse(child.data);
            } catch (error) {
              if (error instanceof z.ZodError) {
                error.issues.forEach((issue) => {
                  errors.push({
                    path: `${childPath}.data.${issue.path.join(".")}`,
                    message: issue.message,
                    blockId: childId,
                  });
                });
              }
            }
          }
        });
      }
    }

    // Reusable Block: Prüfe ob ID vorhanden (nur Warning, kein Error)
    if (block.type === "reusable") {
      const reusableId = (block.data as any)?.reusableId;
      if (!reusableId || reusableId.trim() === "") {
        warnings.push({
          path: `${blockPath}.data.reusableId`,
          message: "Reusable Block ID fehlt",
          blockId,
        });
      }
    }
  });

  return { errors, warnings };
}

