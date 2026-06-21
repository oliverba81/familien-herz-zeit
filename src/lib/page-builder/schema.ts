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
 * Page Content V3 (Puck Visual Builder).
 *
 * Strukturelle Form der Puck-Daten (`@puckeditor/core`): ein `root`-Objekt und eine
 * `content`-Liste (Top-Level-Komponenten); Kinder liegen ab Puck 0.19 inline als
 * Slot-Felder in den Props (kein Top-Level `zones`). Wir taggen zusätzlich `version: 3`,
 * verlassen uns für die Erkennung aber primär auf die Struktur (auch ungetaggte
 * Puck-Daten aus der Library werden korrekt erkannt).
 */
export interface PageContentPuck {
  version?: 3;
  root: { props?: Record<string, unknown> } & Record<string, unknown>;
  content: unknown[];
  /** Legacy-Puck (< 0.19) — nur für Abwärtskompatibilität; neue Daten nutzen Slots. */
  zones?: Record<string, unknown[]>;
}

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

/**
 * Prüft, ob der Wert Puck-Daten (V3) sind.
 *
 * Erkennung: explizites `version: 3` ODER strukturell (`root`-Objekt + `content`-Array),
 * solange es nicht bereits als V1/V2 getaggt ist. So werden auch Puck-Daten ohne
 * `version`-Tag (direkt aus der Library) korrekt erkannt.
 */
export function isPageContentPuck(value: unknown): value is PageContentPuck {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version === 3) return true;
  // Explizit als V1/V2 getaggt → niemals Puck.
  if (v.version === 1 || v.version === 2) return false;
  return (
    typeof v.root === "object" &&
    v.root !== null &&
    Array.isArray(v.content)
  );
}

/**
 * Einziger Content-Form-Guard für Routing/Validierung/Rendering.
 *
 * KRITISCH: Puck-Daten dürfen NIEMALS in `parsePageContent`/`migrateToV1` laufen — dort
 * fallen sie auf `createEmptyContent()` zurück und die Seite würde beim Speichern auf LEER
 * überschrieben (Totalverlust). Alle Konsumenten (PUT/Publish/Public-Route/SEO/Renderer)
 * müssen ihre Form über diese Funktion bestimmen.
 */
export function resolveContentKind(value: unknown): "v1" | "v2" | "puck" {
  if (isPageContentPuck(value)) return "puck";
  if (isPageContentV2(value)) return "v2";
  return "v1";
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

