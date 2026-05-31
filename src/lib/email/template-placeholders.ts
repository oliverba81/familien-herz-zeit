/**
 * Platzhalter-Legenden für E-Mail-Templates
 */

export interface PlaceholderInfo {
  placeholder: string;
  description: string;
  example?: string;
}

export function getPlaceholdersForTemplate(
  templateType: string
): PlaceholderInfo[] {
  const allPlaceholders: Record<string, PlaceholderInfo> = {
    courseTitle: {
      placeholder: "{{courseTitle}}",
      description: "Titel des Kurses",
      example: "Babyzeichensprache für Anfänger",
    },
    parentName: {
      placeholder: "{{parentName}}",
      description: "Vollständiger Name des Elternteils (Vorname + Nachname)",
      example: "Max Mustermann",
    },
    bookingId: {
      placeholder: "{{bookingId}}",
      description: "Eindeutige Buchungs-ID",
      example: "clx1234567890",
    },
    price: {
      placeholder: "{{price}}",
      description: "Preis des Kurses (formatiert als Euro-Betrag oder 'kostenlos')",
      example: "50,00 €",
    },
    startAt: {
      placeholder: "{{startAt}}",
      description: "Datum und Uhrzeit des Kursbeginns (formatiert im Berliner Format)",
      example: "15.03.2024, 10:00 Uhr",
    },
    email: {
      placeholder: "{{email}}",
      description: "E-Mail-Adresse des Teilnehmers",
      example: "teilnehmer@example.com",
    },
    watchUrl: {
      placeholder: "{{watchUrl}}",
      description: "URL zum Ansehen des Videokurses",
      example: "https://example.com/watch/abc123",
    },
    expiresAt: {
      placeholder: "{{expiresAt}}",
      description: "Ablaufdatum des Zugangslinks (formatiert als deutsches Datum)",
      example: "15.04.2024, 23:59 Uhr",
    },
    name: {
      placeholder: "{{name}}",
      description: "Name des Kontakts (bei Kontaktformular)",
      example: "Max Mustermann",
    },
    message: {
      placeholder: "{{message}}",
      description: "Nachricht des Kontakts (bei Kontaktformular, HTML-escaped)",
      example: "Ich habe eine Frage zu...",
    },
  };

  // Definiere welche Platzhalter für welchen Template-Typ verfügbar sind
  const templatePlaceholders: Record<string, string[]> = {
    booking_user: [
      "courseTitle",
      "parentName",
      "bookingId",
      "price",
      "startAt",
    ],
    booking_confirmed: [
      "courseTitle",
      "parentName",
      "bookingId",
      "price",
      "startAt",
    ],
    booking_admin: [
      "courseTitle",
      "startAt",
      "parentName",
      "email",
      "bookingId",
    ],
    video_access: [
      "courseTitle",
      "watchUrl",
      "expiresAt",
    ],
    contact_admin: [
      "name",
      "email",
      "message",
    ],
    contact_user_confirm: [
      "name",
    ],
  };

  const availablePlaceholders = templatePlaceholders[templateType] || [];
  return availablePlaceholders.map((key) => allPlaceholders[key]).filter(Boolean);
}

