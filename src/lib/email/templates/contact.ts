import { renderLayout } from "./layout";

export function renderContactAdminEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}): { subject: string; text: string; html: string } {
  const subject = `Neue Kontaktanfrage von ${name}`;

  const text = `
Neue Kontaktanfrage

Von: ${name} (${email})

Nachricht:
${message}
  `.trim();

  const html = renderLayout({
    title: "Neue Kontaktanfrage",
    preheader: `Von ${name}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong>Von:</strong> ${name}<br>
        <strong>E-Mail:</strong> <a href="mailto:${email}" style="color: #e11d48;">${email}</a>
      </p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #e11d48; border-radius: 4px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, "<br>")}</p>
      </div>
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
        Bitte antworten Sie direkt auf diese E-Mail, um dem Absender zu antworten.
      </p>
    `,
  });

  return { subject, text, html };
}

export function renderContactUserConfirmEmail({
  name,
}: {
  name: string;
}): { subject: string; text: string; html: string } {
  const subject = "Vielen Dank für Ihre Nachricht";

  const text = `
Hallo ${name},

vielen Dank für Ihre Nachricht. Wir haben sie erhalten und werden uns in Kürze bei Ihnen melden.

Mit freundlichen Grüßen,
Familien Herz Zeit
  `.trim();

  const html = renderLayout({
    title: "Vielen Dank für Ihre Nachricht",
    preheader: "Wir haben Ihre Nachricht erhalten",
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo ${name},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für Ihre Nachricht. Wir haben sie erhalten und werden uns in Kürze bei Ihnen melden.
      </p>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
  });

  return { subject, text, html };
}

