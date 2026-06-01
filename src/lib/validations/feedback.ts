import { z } from "zod";

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Option darf nicht leer sein").max(500),
});

const baseQuestion = {
  id: z.string().min(1),
  label: z.string().min(1, "Fragetext ist erforderlich").max(500),
  required: z.boolean(),
};

const choiceQuestionSchema = z.object({
  ...baseQuestion,
  type: z.enum(["SINGLE_CHOICE", "MULTI_CHOICE"]),
  options: z
    .array(optionSchema)
    .min(1, "Mindestens eine Option erforderlich")
    .max(50),
});

const freeTextQuestionSchema = z.object({
  ...baseQuestion,
  type: z.literal("FREE_TEXT"),
});

const ratingQuestionSchema = z.object({
  ...baseQuestion,
  type: z.literal("RATING"),
});

const questionSchema = z.discriminatedUnion("type", [
  choiceQuestionSchema,
  freeTextQuestionSchema,
  ratingQuestionSchema,
]);

export const feedbackFormSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(300),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  collectName: z.boolean(),
  collectEmail: z.boolean(),
  questions: z
    .array(questionSchema)
    .min(1, "Mindestens eine Frage erforderlich")
    .max(100),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

/**
 * Öffentliche Antwort-Einreichung. Antwortwerte werden hier nur grob
 * (Längen-Caps gegen Storage-Abuse) geprüft; die inhaltliche Prüfung
 * gegen die aktuellen Fragen erfolgt serverseitig in validateAnswers().
 */
export const answerValueSchema = z.union([
  z.string().max(5000),
  z.array(z.string().max(500)).max(50),
  z.number(),
]);

export const publicSubmitSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  email: z
    .string()
    .email("Ungültige E-Mail-Adresse")
    .max(200)
    .optional()
    .or(z.literal("")),
  website: z.string().optional(), // Honeypot
  consent: z.boolean().optional(),
  answers: z.record(z.string(), answerValueSchema),
});

export type PublicSubmitData = z.infer<typeof publicSubmitSchema>;
