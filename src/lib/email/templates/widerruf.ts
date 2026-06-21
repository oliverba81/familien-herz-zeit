import { renderLayout } from "./layout";

interface WiderrufFields {
  contractReference: string;
  email: string;
  name?: string | null;
  contractType?: string | null;
  contractDate?: string | null;
  message?: string | null;
}

/**
 * Admin-Benachrichtigung über einen eingegangenen Widerruf (§ 356a BGB).
 */
export function renderWiderrufAdminEmail(
  fields: WiderrufFields
): { subject: string; text: string; html: string } {
  const { contractReference, email, name, contractType, contractDate, message } =
    fields;

  const subject = `Widerruf eingegangen – ${contractReference}`;

  const lines = [
    `Bestell-/Vertragsnummer: ${contractReference}`,
    `E-Mail: ${email}`,
    name ? `Name: ${name}` : null,
    contractType ? `Vertrag/Leistung: ${contractType}` : null,
    contractDate ? `Bestellt/erhalten am: ${contractDate}` : null,
    message ? `\nNachricht:\n${message}` : null,
  ].filter(Boolean);

  const text = `Neuer Widerruf über die elektronische Widerrufsfunktion\n\n${lines.join("\n")}`.trim();

  const html = renderLayout({
    title: "Neuer Widerruf eingegangen",
    preheader: `Widerruf zu ${contractReference}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Über die elektronische Widerrufsfunktion (§ 356a BGB) ist ein Widerruf eingegangen:
      </p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #e11d48; border-radius: 4px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.8;">
          <strong>Bestell-/Vertragsnummer:</strong> ${contractReference}<br>
          <strong>E-Mail:</strong> <a href="mailto:${email}" style="color: #e11d48;">${email}</a>
          ${name ? `<br><strong>Name:</strong> ${name}` : ""}
          ${contractType ? `<br><strong>Vertrag/Leistung:</strong> ${contractType}` : ""}
          ${contractDate ? `<br><strong>Bestellt/erhalten am:</strong> ${contractDate}` : ""}
        </p>
        ${
          message
            ? `<p style="margin: 12px 0 0 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, "<br>")}</p>`
            : ""
        }
      </div>
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
        Bitte bearbeite den Widerruf fristgerecht und erstatte ggf. bereits geleistete Zahlungen.
      </p>
    `,
  });

  return { subject, text, html };
}

/**
 * Eingangsbestätigung an den Verbraucher auf dauerhaftem Datenträger
 * (gesetzlich gefordert bei Nutzung der elektronischen Widerrufsfunktion).
 */
export function renderWiderrufUserConfirmEmail(
  fields: WiderrufFields
): { subject: string; text: string; html: string } {
  const { contractReference } = fields;

  const subject = "Eingangsbestätigung deines Widerrufs";

  const text = `
Hallo,

wir bestätigen den Eingang deines Widerrufs zum Vertrag mit der Bestell-/Vertragsnummer ${contractReference}.

Wir bearbeiten deinen Widerruf und melden uns bei Rückfragen. Etwaige bereits geleistete Zahlungen erstatten wir dir nach den gesetzlichen Vorgaben.

Mit freundlichen Grüßen,
Familien Herz Zeit
  `.trim();

  const html = renderLayout({
    title: "Eingangsbestätigung deines Widerrufs",
    preheader: `Widerruf zu ${contractReference} erhalten`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo,
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        wir bestätigen den Eingang deines Widerrufs zum Vertrag mit der Bestell-/Vertragsnummer
        <strong>${contractReference}</strong>.
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Wir bearbeiten deinen Widerruf und melden uns bei Rückfragen. Etwaige bereits geleistete
        Zahlungen erstatten wir dir nach den gesetzlichen Vorgaben.
      </p>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
  });

  return { subject, text, html };
}
