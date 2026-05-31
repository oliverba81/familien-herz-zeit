import { z } from "zod";

export const waitlistEntrySchema = z
  .object({
    courseId: z.string().min(1).optional().nullable(),
    firstName: z.string().min(1, "Vorname ist erforderlich"),
    lastName: z.string().min(1, "Nachname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail-Adresse"),
    phone: z.string().optional().nullable(),
    childFirstName: z.string().optional().nullable(),
    childLastName: z.string().optional().nullable(),
    childBirthDate: z
      .string()
      .optional()
      .nullable()
      .refine(
        (value) => {
          if (!value) return true;
          const d = new Date(value);
          return !isNaN(d.getTime()) && d <= new Date();
        },
        { message: "Ungültiges Geburtsdatum" }
      ),
    childNotes: z.string().optional().nullable(),
    interestLabel: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type WaitlistEntryData = z.infer<typeof waitlistEntrySchema>;

