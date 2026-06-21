import { z } from "zod";

/**
 * Schema für die elektronische Widerrufsfunktion (§ 356a BGB).
 *
 * Datensparsamkeit: Pflicht sind nur die Vertragsidentifikation
 * (Bestell-/Vertragsnummer) und ein elektronisches Kommunikationsmittel
 * (E-Mail) für die Eingangsbestätigung. Alle weiteren Angaben sind optional.
 * Ein Pflicht-Widerrufsgrund ist unzulässig.
 */
export const widerrufSchema = z.object({
  // Pflicht: Vertragsidentifikation + E-Mail
  contractReference: z
    .string()
    .min(1, "Bitte gib deine Bestell- oder Vertragsnummer an"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  // Optional
  name: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  // Spam-Schutz
  website: z.string().optional().nullable(), // Honeypot
  recaptchaToken: z.string().optional(),
});

export type WiderrufData = z.infer<typeof widerrufSchema>;
