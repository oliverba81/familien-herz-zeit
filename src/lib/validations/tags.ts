import { z } from "zod";

export const tagSchema = z.object({
  name: z.string().min(2, "Tag-Name muss mindestens 2 Zeichen lang sein"),
});

export type TagFormData = z.infer<typeof tagSchema>;



