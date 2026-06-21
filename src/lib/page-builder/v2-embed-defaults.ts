import { createBlockId } from "./ids";
import { getBlockRegistryEntry } from "./registry";

/**
 * Block-Typen, die als Platzhalter im V2-HTML eingebettet werden können.
 */
export const V2_EMBED_BLOCK_TYPES = [
  "courses",
  "current-appointments",
  "herzzeit-story",
  "contactForm",
] as const;

export type V2EmbedBlockType = (typeof V2_EMBED_BLOCK_TYPES)[number];

/** Labels für V2-Embed-Platzhalter (TinyMCE / Frontend). */
export const V2_BLOCK_LABELS: Record<V2EmbedBlockType, string> = {
  courses: "Kurse & Termine",
  "current-appointments": "Aktuelle Termine",
  "herzzeit-story": "HerzZeit-Geschichten",
  contactForm: "Kontaktformular",
};

/** Icons für V2-Embed-Platzhalter. */
export const V2_BLOCK_ICONS: Record<V2EmbedBlockType, string> = {
  courses: "📅",
  "current-appointments": "🗓️",
  "herzzeit-story": "📖",
  contactForm: "✉️",
};

/** UTF-8-sicheres Base64-Encoding (nur ASCII im Attribut → Umlaute bleiben erhalten). */
function toBase64Utf8(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Base64 wieder nach UTF-8 dekodieren. */
function fromBase64Utf8(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64").toString("utf8");
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Prüft, ob der String wie Base64 aussieht (nur ASCII-Zeichen). */
function looksLikeBase64(s: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(s) && s.length > 0;
}

/**
 * Speichert Blockdaten für das data-fhz-block-data-Attribut.
 * Nutzt Base64 (UTF-8), damit Umlaute und Sonderzeichen zuverlässig erhalten bleiben.
 */
export function escapeEmbedDataForAttribute(data: Record<string, unknown>): string {
  const raw = JSON.stringify(data);
  return toBase64Utf8(raw);
}

/**
 * Liest Blockdaten aus dem data-fhz-block-data-Attribut.
 * Unterstützt Base64 (neu, Umlaute-sicher) und das alte HTML-Entity-Format (Rückwärtskompatibilität).
 */
export function parseEmbedDataFromAttribute(
  escaped: string | null | undefined
): Record<string, unknown> | null {
  if (escaped == null || escaped === "") return null;
  const trimmed = String(escaped).trim();
  try {
    if (looksLikeBase64(trimmed)) {
      const json = fromBase64Utf8(trimmed);
      return JSON.parse(json) as Record<string, unknown>;
    }
    const unescaped = trimmed
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    return JSON.parse(unescaped) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Erzeugt das exakte HTML für einen V2-Embed-Platzhalter.
 * @param blockType - Block-Typ
 * @param data - Optionale Blockdaten (werden als data-fhz-block-data gespeichert, sonst Defaults)
 * @param blockId - Optionale stabile ID (für Konfiguration im Editor)
 */
export function getV2EmbedPlaceholderHtml(
  blockType: V2EmbedBlockType,
  data?: Record<string, unknown>,
  blockId?: string
): string {
  const label = V2_BLOCK_LABELS[blockType];
  const icon = V2_BLOCK_ICONS[blockType];
  const id = blockId ?? createBlockId();
  const dataAttr =
    data != null
      ? ` data-fhz-block-data="${escapeEmbedDataForAttribute(data)}"`
      : "";
  return `<div data-fhz-block="${blockType}" data-fhz-block-id="${id}" class="fhz-embed fhz-embed-${blockType}" contenteditable="false"${dataAttr}><span class="fhz-embed-label">${icon} ${label}</span></div>`;
}

const DATA_ATTR_REGEX = /\s*data-fhz-block-data="(?:[^"]|&quot;|&amp;|&lt;|&gt;)*"/;

/**
 * Ersetzt in der HTML-Zeichenkette die data-fhz-block-data des Embeds mit der angegebenen blockId.
 */
export function updateEmbedDataInHtml(
  html: string,
  blockId: string,
  newData: Record<string, unknown>
): string {
  const escaped = escapeEmbedDataForAttribute(newData);
  const safeId = blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    '(<div\\s+[^>]*?data-fhz-block-id="' + safeId + '"[^>]*)(>)([\\s\\S]*?)(</div>)',
    "i"
  );
  return html.replace(re, (_, opening, bracket, inner, closeTag) => {
    const newOpening = opening.replace(DATA_ATTR_REGEX, "") + ` data-fhz-block-data="${escaped}"`;
    return newOpening + bracket + inner + closeTag;
  });
}

/** Findet das div mit data-fhz-block-id im HTML und gibt blockType und data zurück. */
export function findEmbedInHtmlById(
  html: string,
  blockId: string
): { blockType: string; data: Record<string, unknown> } | null {
  const safeId = blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const divRe = new RegExp(
    '<div\\s+([^>]*data-fhz-block-id="' + safeId + '"[^>]*)>([\\s\\S]*?)</div>',
    "i"
  );
  const m = html.match(divRe);
  if (!m) return null;
  const tagContent = m[1];
  const blockTypeMatch = tagContent.match(/data-fhz-block="([^"]+)"/);
  const blockType = blockTypeMatch ? blockTypeMatch[1] : "";
  if (!V2_EMBED_BLOCK_TYPES.includes(blockType as V2EmbedBlockType)) return null;
  const dataMatch = tagContent.match(/data-fhz-block-data="((?:[^"]|&quot;|&amp;|&lt;|&gt;)*)"/);
  const dataRaw = dataMatch ? parseEmbedDataFromAttribute(dataMatch[1]) : null;
  const data = dataRaw ?? getV2EmbedDefaultData(blockType as V2EmbedBlockType);
  return { blockType, data };
}

/**
 * Default-Daten für V2-Platzhalter (data-fhz-block).
 * Nutzt die Block-Registry, damit Konfiguration und Frontend-Rendering übereinstimmen.
 */
export function getV2EmbedDefaultData(
  blockType: V2EmbedBlockType
): Record<string, unknown> {
  try {
    const entry = getBlockRegistryEntry(blockType);
    return entry.defaultData() as Record<string, unknown>;
  } catch {
    return {};
  }
}
