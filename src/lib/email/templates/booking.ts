import { renderLayout } from "./layout";
import { formatBerlinDateTime } from "@/lib/utils/datetime";
import { formatEuroFromCents } from "@/lib/utils/money";

export function renderBookingUserEmail({
  courseTitle,
  startAt,
  parentName,
  bookingId,
  priceCents,
}: {
  courseTitle: string;
  startAt: Date;
  parentName: string;
  bookingId: string;
  priceCents: number;
}): { subject: string; text: string; html: string } {
  const subject = `Deine Buchungsanfrage für: ${courseTitle}`;

  const startAtFormatted = formatBerlinDateTime(startAt);
  const price = priceCents > 0 ? formatEuroFromCents(priceCents) : "kostenlos";

  const text = `
Hallo ${parentName},

vielen Dank für deine Buchungsanfrage!

Kurs: ${courseTitle}
Datum & Zeit: ${startAtFormatted}
Preis: ${price}
Buchungs-ID: ${bookingId}

Deine Buchung hat den Status "PENDING" (Ausstehend). Wir prüfen deine Anfrage und senden dir eine Bestätigung zu.

Mit freundlichen Grüßen,
Familien Herz Zeit
  `.trim();

  const html = renderLayout({
    title: "Deine Buchungsanfrage",
    preheader: `Kurs: ${courseTitle}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo ${parentName},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für deine Buchungsanfrage!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${courseTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${startAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preis:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${price}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">${bookingId}</td>
          </tr>
        </table>
      </div>
      <div style="margin: 20px 0; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Status:</strong> Deine Buchung hat den Status "PENDING" (Ausstehend). Wir prüfen deine Anfrage und senden dir eine Bestätigung zu.
        </p>
      </div>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
  });

  return { subject, text, html };
}

export function renderBookingConfirmedEmail({
  courseTitle,
  startAt,
  parentName,
  bookingId,
  priceCents,
}: {
  courseTitle: string;
  startAt: Date;
  parentName: string;
  bookingId: string;
  priceCents: number;
}): { subject: string; text: string; html: string } {
  const subject = `Buchungsbestätigung: ${courseTitle}`;

  const startAtFormatted = formatBerlinDateTime(startAt);
  const price = priceCents > 0 ? formatEuroFromCents(priceCents) : "kostenlos";

  const text = `
Hallo ${parentName},

Deine Buchung wurde bestätigt!

Kurs: ${courseTitle}
Datum & Zeit: ${startAtFormatted}
Preis: ${price}
Buchungs-ID: ${bookingId}

Wir freuen uns, dich beim Kurs begrüßen zu dürfen!

Mit freundlichen Grüßen,
Familien Herz Zeit
  `.trim();

  const html = renderLayout({
    title: "Buchungsbestätigung",
    preheader: `Kurs: ${courseTitle}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo ${parentName},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Deine Buchung wurde bestätigt!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${courseTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${startAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preis:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${price}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">${bookingId}</td>
          </tr>
        </table>
      </div>
      <div style="margin: 20px 0; padding: 12px; background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
        <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
          <strong>✓ Status: Bestätigt</strong> - Wir freuen uns, dich beim Kurs begrüßen zu dürfen!
        </p>
      </div>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
  });

  return { subject, text, html };
}

export function renderBookingAdminEmail({
  courseTitle,
  startAt,
  parentName,
  email,
  bookingId,
}: {
  courseTitle: string;
  startAt: Date;
  parentName: string;
  email: string;
  bookingId: string;
}): { subject: string; text: string; html: string } {
  const subject = `Neue Buchung: ${courseTitle}`;

  const startAtFormatted = formatBerlinDateTime(startAt);

  const text = `
Neue Buchung eingegangen

Kurs: ${courseTitle}
Datum & Zeit: ${startAtFormatted}
Teilnehmer: ${parentName} (${email})
Buchungs-ID: ${bookingId}
Status: PENDING
  `.trim();

  const html = renderLayout({
    title: "Neue Buchung",
    preheader: `Kurs: ${courseTitle}`,
    bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Eine neue Buchung ist eingegangen:
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${courseTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${startAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Teilnehmer:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">${parentName} (<a href="mailto:${email}" style="color: #e11d48;">${email}</a>)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">${bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: 600;">PENDING</td>
          </tr>
        </table>
      </div>
    `,
  });

  return { subject, text, html };
}

