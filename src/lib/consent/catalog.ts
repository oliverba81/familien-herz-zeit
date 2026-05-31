export type CookieCategory = "necessary" | "statistics" | "marketing" | "unknown";
export type CookieConfidence = "low" | "medium" | "high";
export type CookieSource = "ai" | "manual";

export interface CookieCatalogItem {
  name: string;
  category: CookieCategory;
  purpose?: string;
  provider?: string;
  duration?: string;
  lastSeenAt?: string;
  confidence?: CookieConfidence;
  source?: CookieSource;
}

const DEFAULT_CATEGORY: CookieCategory = "unknown";

function isValidCategory(value: unknown): value is CookieCategory {
  return value === "necessary" || value === "statistics" || value === "marketing" || value === "unknown";
}

function isValidConfidence(value: unknown): value is CookieConfidence {
  return value === "low" || value === "medium" || value === "high";
}

function isValidSource(value: unknown): value is CookieSource {
  return value === "ai" || value === "manual";
}

function normalizeItem(value: any): CookieCatalogItem | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.name !== "string" || value.name.trim().length === 0) return null;

  const category = isValidCategory(value.category) ? value.category : DEFAULT_CATEGORY;

  return {
    name: value.name.trim(),
    category,
    purpose: typeof value.purpose === "string" ? value.purpose : undefined,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    duration: typeof value.duration === "string" ? value.duration : undefined,
    lastSeenAt: typeof value.lastSeenAt === "string" ? value.lastSeenAt : undefined,
    confidence: isValidConfidence(value.confidence) ? value.confidence : undefined,
    source: isValidSource(value.source) ? value.source : undefined,
  };
}

export function parseCookieCatalog(raw: string | null | undefined): CookieCatalogItem[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((item) => normalizeItem(item))
      .filter((item): item is CookieCatalogItem => item !== null);

    return normalized;
  } catch {
    return [];
  }
}

export function serializeCookieCatalog(items: CookieCatalogItem[]): string {
  return JSON.stringify(items);
}

export function normalizeCookieSuggestion(value: any): CookieCatalogItem | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.name !== "string" || value.name.trim().length === 0) return null;

  const category = isValidCategory(value.category) ? value.category : DEFAULT_CATEGORY;

  return {
    name: value.name.trim(),
    category,
    purpose: typeof value.purpose === "string" ? value.purpose : undefined,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    duration: typeof value.duration === "string" ? value.duration : undefined,
    confidence: isValidConfidence(value.confidence) ? value.confidence : undefined,
    source: isValidSource(value.source) ? value.source : undefined,
  };
}

export function upsertScanResults(
  items: CookieCatalogItem[],
  scannedNames: string[],
  nowIso: string
): CookieCatalogItem[] {
  const byName = new Map(items.map((item) => [item.name, item]));

  scannedNames.forEach((name) => {
    const existing = byName.get(name);
    if (existing) {
      byName.set(name, { ...existing, lastSeenAt: nowIso });
    } else {
      byName.set(name, {
        name,
        category: DEFAULT_CATEGORY,
        lastSeenAt: nowIso,
      });
    }
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}
