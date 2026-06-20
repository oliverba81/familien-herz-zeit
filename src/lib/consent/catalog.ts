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

/**
 * Bekannte Cookies, die diese Anwendung selbst (bzw. eingebundene Dienste)
 * setzen kann. Sie werden im Banner immer angezeigt, auch wenn sie noch nicht
 * über den Cookie-Scanner im Admin-Bereich erfasst wurden. Einträge aus dem
 * gepflegten Katalog (DB) haben Vorrang und überschreiben diese Defaults.
 */
export const DEFAULT_COOKIE_CATALOG: CookieCatalogItem[] = [
  {
    name: "fhz_consent",
    category: "necessary",
    purpose: "Speichert deine Cookie-Einwilligung (notwendig/Statistik/Marketing).",
    provider: "Familien-Herz-Zeit",
    duration: "180 Tage",
    source: "manual",
  },
  {
    name: "__Secure-next-auth.session-token",
    category: "necessary",
    purpose: "Hält die angemeldete Sitzung im geschützten Bereich aufrecht.",
    provider: "Familien-Herz-Zeit (NextAuth)",
    duration: "30 Tage",
    source: "manual",
  },
  {
    name: "__Host-next-auth.csrf-token",
    category: "necessary",
    purpose: "Schützt Anmeldeformulare vor Cross-Site-Request-Forgery (CSRF).",
    provider: "Familien-Herz-Zeit (NextAuth)",
    duration: "Sitzung",
    source: "manual",
  },
  {
    name: "paypal_booking_*",
    category: "necessary",
    purpose: "Überträgt Buchungsdaten temporär über die PayPal-Weiterleitung.",
    provider: "Familien-Herz-Zeit",
    duration: "1 Stunde",
    source: "manual",
  },
  {
    name: "_GRECAPTCHA",
    category: "marketing",
    purpose: "Spam-/Bot-Schutz im Kontaktformular (nur bei aktiviertem reCAPTCHA).",
    provider: "Google reCAPTCHA",
    duration: "6 Monate",
    source: "manual",
  },
];

/**
 * Verbindet die im Admin gepflegten Katalog-Einträge mit den bekannten
 * Default-Cookies. Gepflegte Einträge (DB) überschreiben gleichnamige Defaults.
 */
export function mergeWithDefaultCatalog(items: CookieCatalogItem[]): CookieCatalogItem[] {
  const byName = new Map<string, CookieCatalogItem>(
    DEFAULT_COOKIE_CATALOG.map((item) => [item.name, item])
  );

  items.forEach((item) => {
    byName.set(item.name, item);
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

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
