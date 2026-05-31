/**
 * Konvertiert Daten in CSV-Format
 * @param rows Array von Objekten
 * @param headers Array von Header-Namen (optional, wird aus ersten Row extrahiert)
 * @param delimiter Separator (Standard: ; für Excel-Kompatibilität)
 * @returns CSV-String
 */
export function toCsv(
  rows: Record<string, any>[],
  headers?: string[],
  delimiter: string = ";"
): string {
  if (rows.length === 0) {
    return "";
  }

  // Headers extrahieren falls nicht angegeben
  const csvHeaders = headers || Object.keys(rows[0]);

  // CSV-Zeile erstellen (mit Escape für Anführungszeichen)
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    // Wenn Wert Anführungszeichen, Komma oder Newline enthält, in Anführungszeichen setzen
    if (stringValue.includes('"') || stringValue.includes(delimiter) || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Header-Zeile
  const headerLine = csvHeaders.map(escapeCsvValue).join(delimiter);

  // Daten-Zeilen
  const dataLines = rows.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(delimiter)
  );

  // BOM für UTF-8 hinzufügen (für Excel)
  return "\uFEFF" + [headerLine, ...dataLines].join("\n");
}

