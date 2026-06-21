import { renderLayout } from "./layout";

export function renderVideoAccessEmail({
  courseTitle,
  watchUrl,
  expiresAt,
  withdrawalConsent = false,
}: {
  courseTitle: string;
  watchUrl: string;
  expiresAt: Date;
  /**
   * § 356 Abs. 5 BGB: Hat der Kunde dem sofortigen Beginn zugestimmt, wird
   * dies hier als Bestätigung auf dauerhaftem Datenträger (§ 312f BGB)
   * dokumentiert (Erlöschen des Widerrufsrechts).
   */
  withdrawalConsent?: boolean;
}): { subject: string; text: string; html: string } {
  const subject = `Dein Zugang zum Videokurs: ${courseTitle}`;

  const withdrawalText = withdrawalConsent
    ? `

Hinweis zum Widerrufsrecht: Du hast beim Kauf ausdrücklich zugestimmt, dass wir mit der Bereitstellung des Videokurses vor Ablauf der 14-tägigen Widerrufsfrist beginnen, und bestätigt, dass du dadurch mit Beginn der Ausführung dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB).`
    : "";

  const withdrawalHtml = withdrawalConsent
    ? `
      <div style="margin: 20px 0; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 4px;">
        <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.6;">
          <strong>Hinweis zum Widerrufsrecht:</strong> Du hast beim Kauf ausdrücklich zugestimmt, dass wir mit der Bereitstellung des Videokurses vor Ablauf der 14-tägigen Widerrufsfrist beginnen, und bestätigt, dass du dadurch mit Beginn der Ausführung dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB).
        </p>
      </div>`
    : "";

  const expiresFormatted = expiresAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = `
Hallo,

vielen Dank für dein Interesse an unserem Videokurs!

Kurs: ${courseTitle}

Dein persönlicher Zugangslink:
${watchUrl}

Dieser Link ist gültig bis: ${expiresFormatted}${withdrawalText}

Mit freundlichen Grüßen,
Familien Herz Zeit
  `.trim();

  const html = renderLayout({
    title: "Dein Videokurs-Zugang",
    preheader: `Kurs: ${courseTitle}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo,
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für dein Interesse an unserem Videokurs!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Kurs:</strong></p>
        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; font-weight: 600;">${courseTitle}</p>
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Dein persönlicher Zugangslink:</strong></p>
        <a href="${watchUrl}" style="display: inline-block; margin: 10px 0; padding: 12px 24px; background-color: #e11d48; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Jetzt Videokurs ansehen
        </a>
        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px; word-break: break-all;">
          ${watchUrl}
        </p>
      </div>
      <div style="margin: 20px 0; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Hinweis:</strong> Dieser Link ist gültig bis zum <strong>${expiresFormatted}</strong>. Bitte speichere diesen Link, um später darauf zuzugreifen.
        </p>
      </div>
      ${withdrawalHtml}
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
  });

  return { subject, text, html };
}

