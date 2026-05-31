import { z } from "zod";
import { migrateToV1 } from "./migrate";
import { BlockType } from "./types";

/**
 * Block Type Schema
 */
export const blockTypeSchema = z.enum([
  "hero",
  "text",
  "richText",
  "image",
  "video",
  "features",
  "testimonials",
  "cta",
  "spacer",
  "table",
  "section",
  "reusable",
  "courses",
  "current-appointments",
  "herzzeit-story",
  "contactForm",
]);

/**
 * Page Block Schema
 */
export const pageBlockSchema = z.object({
  id: z.string().min(1),
  type: blockTypeSchema,
  data: z.record(z.string(), z.any()), // Block-spezifische Validierung in Registry
});

/**
 * Page Content Schema V1
 */
export const pageContentSchemaV1 = z.object({
  version: z.literal(1),
  blocks: z.array(pageBlockSchema),
});

export type PageContentV1 = z.infer<typeof pageContentSchemaV1>;
export type PageBlock = z.infer<typeof pageBlockSchema>;

/**
 * Page Content Schema V2 (WYSIWYG HTML)
 */
export const pageContentSchemaV2 = z.object({
  version: z.literal(2),
  html: z.string(),
});

export type PageContentV2 = z.infer<typeof pageContentSchemaV2>;

/**
 * Prüft, ob der Wert Page-Content V2 ist (WYSIWYG HTML).
 */
export function isPageContentV2(value: unknown): value is PageContentV2 {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    (value as { version: unknown }).version === 2 &&
    "html" in value &&
    typeof (value as { html: unknown }).html === "string"
  );
}

export interface ParseResult {
  content: PageContentV1;
  recovery?: {
    hadError: boolean;
    originalSnippet?: string;
  };
}

/**
 * Parst Page Content mit Migration und Recovery
 */
export function parsePageContent(input: unknown): PageContentV1;
export function parsePageContent(input: unknown, withRecovery: true): ParseResult;
export function parsePageContent(
  input: unknown,
  withRecovery?: boolean
): PageContentV1 | ParseResult {
  let originalSnippet: string | undefined;
  try {
    if (typeof input === "string") {
      originalSnippet = input.substring(0, 200);
    } else {
      originalSnippet = JSON.stringify(input).substring(0, 200);
    }
  } catch {
    originalSnippet = String(input).substring(0, 200);
  }

  // Versuche V1 Schema
  const v1Result = pageContentSchemaV1.safeParse(input);
  if (v1Result.success) {
    if (withRecovery) {
      return { content: v1Result.data };
    }
    return v1Result.data;
  }

  // Migration: Altes Format
  try {
    const migrated = migrateToV1(input);
    // Validiere migrierten Content
    const validated = pageContentSchemaV1.safeParse(migrated);
    if (validated.success) {
      if (withRecovery) {
        return { content: validated.data };
      }
      return validated.data;
    }
  } catch (error) {
    // Migration fehlgeschlagen
  }

  // Fallback: Leerer Content mit Recovery Info
  const emptyContent = createEmptyContent();
  if (withRecovery) {
    return {
      content: emptyContent,
      recovery: {
        hadError: true,
        originalSnippet,
      },
    };
  }
  return emptyContent;
}

/**
 * Erstellt leeren Content
 */
export function createEmptyContent(): PageContentV1 {
  return {
    version: 1,
    blocks: [],
  };
}

