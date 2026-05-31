import { z } from "zod";

export const pageUpsertSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  slug: z
    .string()
    .min(1, "Slug ist erforderlich")
    .regex(/^[a-z0-9-\/]+$/, "Slug darf nur Kleinbuchstaben, Zahlen, Bindestriche und Schrägstriche enthalten"),
  published: z.boolean(),
  showTitle: z.boolean(),
  containerWidth: z.enum(["full", "narrow", "medium", "wide"]).optional(),
  customCss: z.string().optional().nullable(),
  metaDescription: z.string().max(320).optional().nullable(),
  metaKeywords: z.string().max(500).optional().nullable(),
  ogImageUrl: z.string().max(2000).optional().nullable(),
  contentJson: z.any().optional(), // JSON wird im Admin geparst (Legacy, für Backward Compatibility)
  draftContentJson: z.any().optional(), // Draft Content (wird bevorzugt verwendet)
  // Hinweis: Die Prüfung, ob mindestens eines der Content-Felder vorhanden ist,
  // erfolgt in der API-Route selbst, nicht im Schema
});

export type PageUpsertData = z.infer<typeof pageUpsertSchema>;

