import { db } from "@/lib/db";
import { getDefaultTemplates } from "./templates/defaults";
import { formatBerlinDateTime } from "@/lib/utils/datetime";
import { formatEuroFromCents } from "@/lib/utils/money";

export interface TemplateVariables {
  courseTitle?: string;
  startAt?: Date;
  parentName?: string;
  bookingId?: string;
  priceCents?: number;
  email?: string;
  watchUrl?: string;
  expiresAt?: Date;
  name?: string;
  message?: string;
}

/**
 * Lädt ein E-Mail-Template aus der Datenbank oder verwendet das Standard-Template
 */
async function loadTemplate(type: string): Promise<{
  subject: string;
  textBody: string;
  htmlBody: string;
}> {
  try {
    const template = await db.emailTemplate.findUnique({
      where: { type },
    });

    if (template) {
      return {
        subject: template.subject,
        textBody: template.textBody,
        htmlBody: template.htmlBody,
      };
    }
  } catch (error: any) {
    // Tabelle existiert möglicherweise noch nicht oder anderer DB-Fehler
    // Verwende Standard-Template als Fallback
    console.warn(`[Template] Fehler beim Laden des Templates ${type} aus DB, verwende Standard-Template:`, error?.message || error);
  }

  // Fallback auf Standard-Template
  const defaults = getDefaultTemplates();
  const defaultTemplate = defaults[type];
  if (defaultTemplate) {
    return {
      subject: defaultTemplate.subject,
      textBody: defaultTemplate.textBody,
      htmlBody: defaultTemplate.htmlBody,
    };
  }

  throw new Error(`Template ${type} nicht gefunden`);
}

/**
 * Ersetzt Platzhalter in einem Template-String
 */
function replacePlaceholders(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Ersetze alle Platzhalter
  if (variables.courseTitle) {
    result = result.replace(/\{\{courseTitle\}\}/g, variables.courseTitle);
  }
  if (variables.parentName) {
    result = result.replace(/\{\{parentName\}\}/g, variables.parentName);
  }
  if (variables.bookingId) {
    result = result.replace(/\{\{bookingId\}\}/g, variables.bookingId);
  }
  if (variables.email) {
    result = result.replace(/\{\{email\}\}/g, variables.email);
  }
  if (variables.name) {
    result = result.replace(/\{\{name\}\}/g, variables.name);
  }
  if (variables.message) {
    // Escape HTML in message für sichere Anzeige
    // Zeilenumbrüche bleiben erhalten (werden von white-space: pre-wrap behandelt)
    const escapedMessage = variables.message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    result = result.replace(/\{\{message\}\}/g, escapedMessage);
  }
  if (variables.watchUrl) {
    result = result.replace(/\{\{watchUrl\}\}/g, variables.watchUrl);
  }

  // Formatierte Werte
  if (variables.startAt) {
    const formatted = formatBerlinDateTime(variables.startAt);
    result = result.replace(/\{\{startAt\}\}/g, formatted);
  }
  if (variables.priceCents !== undefined) {
    const price = variables.priceCents > 0 ? formatEuroFromCents(variables.priceCents) : "kostenlos";
    result = result.replace(/\{\{price\}\}/g, price);
  }
  if (variables.expiresAt) {
    const formatted = variables.expiresAt.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    result = result.replace(/\{\{expiresAt\}\}/g, formatted);
  }

  return result;
}

/**
 * Rendert ein E-Mail-Template mit den gegebenen Variablen
 */
export async function renderEmailTemplate(
  type: string,
  variables: TemplateVariables
): Promise<{ subject: string; text: string; html: string }> {
  const template = await loadTemplate(type);

  return {
    subject: replacePlaceholders(template.subject, variables),
    text: replacePlaceholders(template.textBody, variables),
    html: replacePlaceholders(template.htmlBody, variables),
  };
}

