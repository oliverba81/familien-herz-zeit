import { z } from "zod";

export const videoAccessRequestSchema = z.object({
  videoCourseId: z.string().min(1, "Videokurs-ID ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  website: z.string().optional(), // Honeypot
});

export type VideoAccessRequestData = z.infer<typeof videoAccessRequestSchema>;

