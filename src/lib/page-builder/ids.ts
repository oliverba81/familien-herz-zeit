/**
 * Erstellt eine eindeutige Block-ID
 */
export function createBlockId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback für Server/Node
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}



