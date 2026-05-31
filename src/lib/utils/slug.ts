/**
 * Slugify Helper
 * Konvertiert einen String in einen URL-freundlichen Slug
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Umlaute ersetzen
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Alle nicht-alphanumerischen Zeichen durch Bindestrich ersetzen
    .replace(/[^a-z0-9]+/g, "-")
    // Mehrfache Bindestriche durch einen ersetzen
    .replace(/-+/g, "-")
    // Führende und abschließende Bindestriche entfernen
    .replace(/^-+|-+$/g, "");
}

/**
 * Erstellt einen eindeutigen Slug mit Suffix falls nötig
 */
export async function createUniqueSlug(
  baseSlug: string,
  checkUnique: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const isUnique = await checkUnique(slug);
    if (isUnique) {
      return slug;
    }
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Fallback: Timestamp anhängen
  return `${baseSlug}-${Date.now()}`;
}



