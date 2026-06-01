export type FeedbackQuestionType =
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "FREE_TEXT"
  | "RATING";

export interface FeedbackOption {
  id: string;
  label: string;
}

export interface ChoiceQuestion {
  id: string;
  type: "SINGLE_CHOICE" | "MULTI_CHOICE";
  label: string;
  required: boolean;
  options: FeedbackOption[];
}

export interface FreeTextQuestion {
  id: string;
  type: "FREE_TEXT";
  label: string;
  required: boolean;
}

export interface RatingQuestion {
  id: string;
  type: "RATING";
  label: string;
  required: boolean;
}

export type FeedbackQuestion =
  | ChoiceQuestion
  | FreeTextQuestion
  | RatingQuestion;

/** Single-Choice -> Option-id; Multi-Choice -> Option-ids; Free text -> string; Rating -> 1..5 */
export type FeedbackAnswerValue = string | string[] | number;

export type FeedbackAnswers = Record<string, FeedbackAnswerValue>;

/**
 * Liest die als Prisma `Json` gespeicherten Fragen typsicher aus.
 * Prisma gibt `Prisma.JsonValue` zurück; hier auf das bekannte Schema gecastet.
 */
export function parseQuestions(value: unknown): FeedbackQuestion[] {
  if (!Array.isArray(value)) return [];
  return value as FeedbackQuestion[];
}

/** Liest die als Prisma `Json` gespeicherten Antworten typsicher aus. */
export function parseAnswers(value: unknown): FeedbackAnswers {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as FeedbackAnswers;
}

export const RATING_MIN = 1;
export const RATING_MAX = 5;
