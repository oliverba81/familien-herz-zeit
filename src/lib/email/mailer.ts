import nodemailer from "nodemailer";

// ENV-Variablen (werden erst beim Aufruf geprüft, nicht beim Import)
// APP_BASE_URL ist optional - wird nur für Links in E-Mails verwendet
const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
] as const;

const optionalEnvVars = [
  "APP_BASE_URL",
] as const;

let transport: nodemailer.Transporter | null = null;

/**
 * Prüft ob alle erforderlichen Umgebungsvariablen gesetzt sind
 */
function checkEnvVars(): void {
  for (const envVar of requiredEnvVars) {
    let value = process.env[envVar];
    // Entferne Anführungszeichen falls vorhanden
    if (value) {
      value = value.replace(/^["']|["']$/g, '').trim();
    }
    // Prüfe ob Variable fehlt oder leer ist
    if (!value || value === "") {
      throw new Error(
        `Missing required environment variable: ${envVar}. Please check your .env file.`
      );
    }
  }
}

/**
 * Erstellt oder gibt den SMTP-Transport zurück (Singleton)
 * @throws Error wenn Umgebungsvariablen fehlen
 */
function getTransport(): nodemailer.Transporter {
  // Prüfe Umgebungsvariablen erst beim ersten Aufruf
  checkEnvVars();

  if (transport) {
    return transport;
  }

  // Entferne Anführungszeichen falls vorhanden (für .env Dateien mit Anführungszeichen)
  const smtpHost = process.env.SMTP_HOST!.replace(/^["']|["']$/g, '');
  const smtpUser = process.env.SMTP_USER!.replace(/^["']|["']$/g, '');
  const smtpPass = process.env.SMTP_PASS!.replace(/^["']|["']$/g, '');
  const smtpPort = parseInt(process.env.SMTP_PORT!.replace(/^["']|["']$/g, ''), 10);
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transport;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/**
 * Prüft ob E-Mail-Versand konfiguriert ist
 * @returns true wenn alle erforderlichen Umgebungsvariablen gesetzt sind
 */
export function isEmailConfigured(): boolean {
  try {
    checkEnvVars();
    return true;
  } catch {
    return false;
  }
}

/**
 * Sendet eine E-Mail über SMTP
 * @param options E-Mail-Optionen
 * @returns MessageId wenn erfolgreich
 * @throws Error wenn Versand fehlschlägt oder E-Mail nicht konfiguriert ist
 */
export async function sendEmail(options: SendEmailOptions): Promise<string> {
  try {
    const transporter = getTransport();

    // Entferne Anführungszeichen von MAIL_FROM falls vorhanden
    const mailFrom = process.env.MAIL_FROM!.replace(/^["']|["']$/g, '');
    
    const toAddress = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    
    // Logge die E-Mail-Details für Debugging
    console.log(`[Mail] Preparing to send email:`, {
      from: mailFrom,
      to: toAddress,
      subject: options.subject,
    });

    const mailOptions = {
      from: mailFrom,
      to: toAddress,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Mail] Email sent successfully:`, {
      to: toAddress,
      messageId: info.messageId,
      response: info.response,
    });

    return info.messageId;
  } catch (error: any) {
    console.error("[Mail] Failed to send email:", error);
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}

