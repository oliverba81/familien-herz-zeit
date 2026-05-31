import { z } from "zod";

export const courseSeriesSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  durationMinutes: z.number().int().min(15).max(480),
  priceCents: z.number().int().min(0),
  maxParticipants: z.number().int().min(1).max(100),
  location: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
  timezone: z.string().min(1, "Zeitzone ist erforderlich"),
  frequency: z.enum(["WEEKLY"]),
  intervalWeeks: z.number().int().min(1).max(12),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Mindestens ein Wochentag muss ausgewählt werden"),
  startDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Ungültiges Startdatum"),
  endDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Ungültiges Enddatum"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Ungültiges Zeitformat (HH:mm)"),
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate >= startDate;
}, {
  message: "Enddatum muss nach dem Startdatum liegen",
  path: ["endDate"],
});

export type CourseSeriesData = z.infer<typeof courseSeriesSchema>;

