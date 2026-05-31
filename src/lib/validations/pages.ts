import { z } from "zod";

export const pageUpsertSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  slug: z
    .string()
    .min(1, "Slug ist erforderlich")
    .regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"),
  published: z.boolean(),
  contentJson: z.any(), // JSON wird im Admin geparst
});

export type PageUpsertData = z.infer<typeof pageUpsertSchema>;

