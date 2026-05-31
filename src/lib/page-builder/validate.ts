import { z } from "zod";
import { BlockType } from "./types";

const blockTypeSchema = z.enum([
  "hero",
  "text",
  "image",
  "video",
  "features",
  "testimonials",
  "cta",
  "spacer",
]);

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

/**
 * Validiert PageContent
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

