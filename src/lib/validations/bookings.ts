import { z } from "zod";

export const bookingSchema = z.object({
  courseId: z.string().min(1, "Kurs-ID ist erforderlich"),
  // Elternteil-Informationen
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  street: z.string().min(1, "Straße & Nr ist erforderlich"),
  zipCode: z.string().min(1, "PLZ ist erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().min(1, "Handynummer ist erforderlich"),
  hasAokVoucher: z.boolean().default(false).optional(),
  // Kind-Informationen
  childFirstName: z.string().min(1, "Vorname des Kindes ist erforderlich"),
  childLastName: z.string().min(1, "Familienname des Kindes ist erforderlich"),
  childBirthDate: z.string().min(1, "Geburtsdatum des Kindes ist erforderlich").refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d <= new Date();
    },
    { message: "Ungültiges Geburtsdatum" }
  ),
  childNotes: z.string().optional().nullable(),
  // Weitere Informationen
  howDidYouHear: z.string().optional().nullable(),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "Sie müssen der Datenschutzerklärung zustimmen",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Sie müssen den Kursbedingungen zustimmen",
  }),
  website: z.string().optional().nullable(), // Honeypot
});

export type BookingData = z.infer<typeof bookingSchema>;

