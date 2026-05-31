import { z } from "zod";

// Validierung für eine einzelne Session (Termin)
const courseSessionSchema = z.object({
  date: z.string().min(1, "Datum ist erforderlich"),
  time: z.string().min(1, "Zeit ist erforderlich"),
  durationMinutes: z.number().int().min(15, "Mindestens 15 Minuten").max(480, "Maximal 8 Stunden"),
}).refine(
  (data) => {
    // Nur validieren, wenn beide Felder ausgefüllt sind
    if (!data.date || !data.time) {
      return true; // Lassen die min(1) Validierung den Fehler zeigen
    }
    // Kombiniere Datum und Zeit zu einem Date-Objekt
    // Format: "YYYY-MM-DD" + "HH:mm" -> "YYYY-MM-DDTHH:mm"
    const combined = `${data.date}T${data.time}`;
    const date = new Date(combined);
    return !isNaN(date.getTime());
  },
  { message: "Ungültiges Datum/Zeit Format", path: ["date"] }
);

// Validierung für datetime-local Format (YYYY-MM-DDTHH:mm) oder ISO-String
export const courseSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  priceCents: z.number().int().min(0, "Preis muss >= 0 sein"),
  maxParticipants: z.number().int().min(1, "Mindestens 1 Teilnehmer").max(100, "Maximal 100 Teilnehmer"),
  location: z.string().optional().nullable(),
  acceptsAokVoucher: z.boolean().default(false).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
  category: z.enum(["AUTO", "COURSE", "TOPIC"]).default("AUTO").optional(),
  plannedMonth: z.number().int().min(1).max(12).optional().nullable(),
  plannedYear: z.number().int().min(2020).max(2100).optional().nullable(),
  sessions: z.array(courseSessionSchema).default([]).optional(),
}).refine(
  (data) => {
    // Entweder müssen Sessions vorhanden sein ODER plannedMonth und plannedYear gesetzt sein
    const hasSessions = data.sessions && data.sessions.length > 0;
    const hasPlannedDate = data.plannedMonth && data.plannedYear;
    return hasSessions || hasPlannedDate;
  },
  {
    message: "Entweder müssen Termine angegeben werden oder ein geplanter Monat und Jahr",
    path: ["sessions"],
  }
);

export type CourseData = z.infer<typeof courseSchema>;
export type CourseSessionData = z.infer<typeof courseSessionSchema>;

