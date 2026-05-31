/**
 * Konvertiert einen String zu einem URL-freundlichen Slug
 * @param text Der zu konvertierende Text
 * @returns URL-freundlicher Slug
 */
export function slugify(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    // Umlaute ersetzen
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Whitespace und Underscore zu Bindestrich
    .replace(/[\s_]+/g, "-")
    // Alle nicht-alphanumerischen Zeichen entfernen (außer Bindestrich)
    .replace(/[^a-z0-9-]/g, "")
    // Mehrfache Bindestriche zusammenfassen
    .replace(/-+/g, "-")
    // Führende und abschließende Bindestriche entfernen
    .replace(/^-+|-+$/g, "");
}


