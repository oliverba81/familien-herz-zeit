import {
  FeedbackQuestion,
  FeedbackAnswers,
  FeedbackAnswerValue,
  RATING_MIN,
  RATING_MAX,
} from "./types";

export interface ValidateAnswersResult {
  ok: boolean;
  error?: string;
  /** Nur die für die aktuellen Fragen gültigen Antworten (bereinigt). */
  cleaned: FeedbackAnswers;
}

function isNonEmpty(value: FeedbackAnswerValue | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return true;
  return false;
}

/**
 * Prüft die eingereichten Antworten gegen die aktuellen Fragen:
 * - Pflichtfragen müssen beantwortet sein
 * - Werttypen müssen zur Frage passen
 * - Choice-Antworten müssen gültige Option-IDs referenzieren
 * Unbekannte Answer-Keys (verwaiste Fragen) werden verworfen.
 */
export function validateAnswers(
  questions: FeedbackQuestion[],
  answers: FeedbackAnswers
): ValidateAnswersResult {
  const cleaned: FeedbackAnswers = {};

  for (const question of questions) {
    const value = answers[question.id];
    const answered = isNonEmpty(value);

    if (!answered) {
      if (question.required) {
        return {
          ok: false,
          error: `Pflichtfrage nicht beantwortet: "${question.label}"`,
          cleaned,
        };
      }
      continue;
    }

    switch (question.type) {
      case "FREE_TEXT": {
        if (typeof value !== "string") {
          return {
            ok: false,
            error: `Ungültige Antwort für "${question.label}"`,
            cleaned,
          };
        }
        cleaned[question.id] = value;
        break;
      }
      case "RATING": {
        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < RATING_MIN ||
          value > RATING_MAX
        ) {
          return {
            ok: false,
            error: `Ungültige Bewertung für "${question.label}"`,
            cleaned,
          };
        }
        cleaned[question.id] = value;
        break;
      }
      case "SINGLE_CHOICE": {
        const validIds = new Set(question.options.map((o) => o.id));
        if (typeof value !== "string" || !validIds.has(value)) {
          return {
            ok: false,
            error: `Ungültige Auswahl für "${question.label}"`,
            cleaned,
          };
        }
        cleaned[question.id] = value;
        break;
      }
      case "MULTI_CHOICE": {
        const validIds = new Set(question.options.map((o) => o.id));
        if (
          !Array.isArray(value) ||
          value.some((v) => typeof v !== "string" || !validIds.has(v))
        ) {
          return {
            ok: false,
            error: `Ungültige Auswahl für "${question.label}"`,
            cleaned,
          };
        }
        // Duplikate entfernen
        cleaned[question.id] = Array.from(new Set(value));
        break;
      }
    }
  }

  return { ok: true, cleaned };
}
