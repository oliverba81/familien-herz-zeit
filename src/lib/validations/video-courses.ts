import { z } from "zod";
import { slugify } from "@/lib/utils/slugify";

export const videoCourseSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  slug: z
    .string()
    .min(1, "Slug ist erforderlich")
    .regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  priceCents: z.number().int().min(0, "Preis muss >= 0 sein"),
  durationMinutes: z.number().int().min(0, "Dauer muss >= 0 sein"),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  videoUrl: z.string().min(1, "Video-URL ist erforderlich"),
  thumbnailUrl: z.string().optional().nullable(),
});

export type VideoCourseData = z.infer<typeof videoCourseSchema>;

/**
 * Generiert einen Slug aus dem Titel, falls der Slug leer ist
 */
export function prepareVideoCourseData(data: {
  title: string;
  slug?: string;
  [key: string]: any;
}): VideoCourseData {
  const slug = data.slug || slugify(data.title);
  return {
    ...data,
    slug,
    status: data.status || "DRAFT",
    description: data.description || "",
    videoUrl: data.videoUrl || "",
    priceCents: data.priceCents ?? 0,
    durationMinutes: data.durationMinutes ?? 0,
  };
}

