import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").optional(),
  vorname: z.string().min(2, "Vorname muss mindestens 2 Zeichen lang sein").optional(),
  nachname: z.string().min(2, "Nachname muss mindestens 2 Zeichen lang sein").optional(),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  message: z.string().min(10, "Nachricht muss mindestens 10 Zeichen lang sein"),
  website: z.string().optional(), // Honeypot
  recaptchaToken: z.string().optional(), // reCAPTCHA Token
}).refine(
  (data) => {
    // Entweder name ODER (vorname UND nachname) muss vorhanden sein
    return data.name || (data.vorname && data.nachname);
  },
  {
    message: "Entweder Name oder Vorname und Nachname müssen angegeben werden",
  }
);

export type ContactData = z.infer<typeof contactSchema>;

