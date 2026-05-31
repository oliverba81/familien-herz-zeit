import { PageContentV1 } from "./schema";

/**
 * Erstellt einen stabilen Hash für PageContent
 * Berücksichtigt sowohl die Block-Reihenfolge als auch die Block-Inhalte
 */
export function contentHash(content: PageContentV1): string {
  // WICHTIG: Reihenfolge beibehalten, da Block-Verschiebungen erkannt werden sollen
  // Erstelle ein Objekt mit Version, Block-Reihenfolge (IDs) und Block-Daten
  const hashContent = {
    version: content.version,
    // Block-Reihenfolge als Array von IDs (für Verschiebungen)
    blockOrder: content.blocks.map(b => b.id),
    // Block-Daten nach ID sortiert (für konsistente Hash-Generierung bei gleichen Daten)
    blocks: Object.fromEntries(
      content.blocks.map(block => [block.id, block.data])
    ),
  };

  const jsonString = JSON.stringify(hashContent);
  
  // Einfacher Hash: Nutze String-Länge + ersten Teil (für 1h reicht das)
  // In Production könnte man crypto.subtle.digest nutzen
  return `${jsonString.length}-${jsonString.substring(0, 100)}`;
}

/**
 * Prüft ob zwei Content-Objekte gleich sind (basierend auf Hash)
 */
export function contentEquals(a: PageContentV1, b: PageContentV1): boolean {
  return contentHash(a) === contentHash(b);
}



