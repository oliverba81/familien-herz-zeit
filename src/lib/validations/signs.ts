import { z } from "zod";

export const signStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const signSchema = z.object({
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen lang sein"),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  howTo: z.string().optional(),
  tips: z.string().optional(),
  videoUrl: z.string().url("Ungültige Video-URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Ungültige Bild-URL").optional().or(z.literal("")),
  status: signStatusSchema,
  tagNames: z.array(z.string().min(1)),
});

export type SignFormData = z.infer<typeof signSchema>;



