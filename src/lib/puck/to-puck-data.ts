import {
  resolveContentKind,
  parsePageContent,
  type PageContentPuck,
} from "@/lib/page-builder/schema";
import { v2HtmlToPuck } from "./migrate-v2";
import { convertV1ToV2Html } from "@/lib/page-builder/v1-to-v2-html";

/**
 * Konvertiert V1-Block-Content nach Puck (V3).
 *
 * Bewusst über den bereits produktiv genutzten `convertV1ToV2Html` (V1 → HTML, inkl.
 * Embed-Platzhalter) und dann `v2HtmlToPuck` — wir erben die bewährte HTML-Erzeugung
 * statt einen riskanten eigenen V1→Block-Baum-Konverter zu schreiben.
 */
export function v1ToPuck(content: unknown): PageContentPuck {
  const v1 = parsePageContent(content); // normalisiert/migriert auf V1
  const html = convertV1ToV2Html(v1);
  return v2HtmlToPuck(html);
}

/**
 * Zentraler Konvertierungs-Eingang für den Puck-Editor: macht aus beliebigem
 * Page-Content (V1/V2/Puck) Puck-Daten (V3) zum Bearbeiten.
 *
 * - Puck → unverändert (nur version:3-Tag sicherstellen)
 * - V2 (HTML) → v2HtmlToPuck
 * - V1 / Legacy / leer → v1ToPuck
 *
 * Nicht-destruktiv: nur fürs Laden in den Editor. Persistiert wird erst beim Speichern.
 */
export function contentToPuck(content: unknown): PageContentPuck {
  const kind = resolveContentKind(content);
  if (kind === "puck") {
    const c = content as PageContentPuck;
    return c.version === 3 ? c : { version: 3, ...c };
  }
  if (kind === "v2") {
    return v2HtmlToPuck((content as { html: string }).html);
  }
  return v1ToPuck(content);
}
