/**
 * Standard-E-Mail-Templates mit Platzhaltern
 * Diese werden verwendet, wenn keine benutzerdefinierten Templates in der Datenbank vorhanden sind.
 */

import { renderLayout } from "./layout";

export interface DefaultTemplate {
  name: string;
  description: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}

/**
 * Gibt die Standard-Templates mit Platzhaltern zurück
 */
export function getDefaultTemplates(): Record<string, DefaultTemplate> {
  return {
    booking_user: {
      name: "Buchungsanfrage an Teilnehmer",
      description: "E-Mail, die an den Teilnehmer gesendet wird, wenn eine Buchung erstellt wird",
      subject: "Deine Buchungsanfrage für: {{courseTitle}}",
      textBody: `Hallo {{parentName}},

vielen Dank für deine Buchungsanfrage!

Kurs: {{courseTitle}}
Datum & Zeit: {{startAt}}
Preis: {{price}}
Buchungs-ID: {{bookingId}}

Deine Buchung hat den Status "PENDING" (Ausstehend). Wir prüfen deine Anfrage und senden dir eine Bestätigung zu.

Mit freundlichen Grüßen,
Familien Herz Zeit`,
      htmlBody: renderLayout({
        title: "Deine Buchungsanfrage",
        preheader: "Kurs: {{courseTitle}}",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo {{parentName}},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für deine Buchungsanfrage!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{courseTitle}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{startAt}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preis:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{price}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">{{bookingId}}</td>
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
      }),
    },
    booking_confirmed: {
      name: "Buchungsbestätigung an Teilnehmer",
      description: "E-Mail, die an den Teilnehmer gesendet wird, wenn eine Buchung bestätigt wird",
      subject: "Buchungsbestätigung: {{courseTitle}}",
      textBody: `Hallo {{parentName}},

Deine Buchung wurde bestätigt!

Kurs: {{courseTitle}}
Datum & Zeit: {{startAt}}
Preis: {{price}}
Buchungs-ID: {{bookingId}}

Wir freuen uns, dich beim Kurs begrüßen zu dürfen!

Mit freundlichen Grüßen,
Familien Herz Zeit`,
      htmlBody: renderLayout({
        title: "Buchungsbestätigung",
        preheader: "Kurs: {{courseTitle}}",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo {{parentName}},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Deine Buchung wurde bestätigt!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{courseTitle}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{startAt}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preis:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{price}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">{{bookingId}}</td>
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
      }),
    },
    booking_admin: {
      name: "Buchungsbenachrichtigung an Admin",
      description: "E-Mail, die an den Administrator gesendet wird, wenn eine neue Buchung erstellt wird",
      subject: "Neue Buchung: {{courseTitle}}",
      textBody: `Neue Buchung eingegangen

Kurs: {{courseTitle}}
Datum & Zeit: {{startAt}}
Teilnehmer: {{parentName}} ({{email}})
Buchungs-ID: {{bookingId}}
Status: PENDING`,
      htmlBody: renderLayout({
        title: "Neue Buchung",
        preheader: "Kurs: {{courseTitle}}",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Eine neue Buchung ist eingegangen:
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Kurs:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{courseTitle}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Datum & Zeit:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{startAt}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Teilnehmer:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">{{parentName}} (<a href="mailto:{{email}}" style="color: #e11d48;">{{email}}</a>)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Buchungs-ID:</strong></td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-family: monospace;">{{bookingId}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: 600;">PENDING</td>
          </tr>
        </table>
      </div>
    `,
      }),
    },
    video_access: {
      name: "Videokurs-Zugang",
      description: "E-Mail mit Zugangslink zum Videokurs",
      subject: "Dein Zugang zum Videokurs: {{courseTitle}}",
      textBody: `Hallo,

vielen Dank für dein Interesse an unserem Videokurs!

Kurs: {{courseTitle}}

Dein persönlicher Zugangslink:
{{watchUrl}}

Dieser Link ist gültig bis: {{expiresAt}}

Mit freundlichen Grüßen,
Familien Herz Zeit`,
      htmlBody: renderLayout({
        title: "Dein Videokurs-Zugang",
        preheader: "Kurs: {{courseTitle}}",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo,
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für dein Interesse an unserem Videokurs!
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Kurs:</strong></p>
        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; font-weight: 600;">{{courseTitle}}</p>
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Dein persönlicher Zugangslink:</strong></p>
        <a href="{{watchUrl}}" style="display: inline-block; margin: 10px 0; padding: 12px 24px; background-color: #e11d48; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Jetzt Videokurs ansehen
        </a>
        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px; word-break: break-all;">
          {{watchUrl}}
        </p>
      </div>
      <div style="margin: 20px 0; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Hinweis:</strong> Dieser Link ist gültig bis zum <strong>{{expiresAt}}</strong>. Bitte speichere diesen Link, um später darauf zuzugreifen.
        </p>
      </div>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
      }),
    },
    contact_admin: {
      name: "Kontaktanfrage an Admin",
      description: "E-Mail, die an den Administrator gesendet wird, wenn eine Kontaktanfrage eingeht",
      subject: "Neue Kontaktanfrage von {{name}}",
      textBody: `Neue Kontaktanfrage

Von: {{name}} ({{email}})

Nachricht:
{{message}}`,
      htmlBody: renderLayout({
        title: "Neue Kontaktanfrage",
        preheader: "Von {{name}}",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong>Von:</strong> {{name}}<br>
        <strong>E-Mail:</strong> <a href="mailto:{{email}}" style="color: #e11d48;">{{email}}</a>
      </p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #e11d48; border-radius: 4px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{{message}}</p>
      </div>
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
        Bitte antworte direkt auf diese E-Mail, um dem Absender zu antworten.
      </p>
    `,
      }),
    },
    contact_user_confirm: {
      name: "Kontaktbestätigung an Absender",
      description: "E-Mail, die an den Absender einer Kontaktanfrage als Bestätigung gesendet wird",
      subject: "Vielen Dank für deine Nachricht",
      textBody: `Hallo {{name}},

vielen Dank für deine Nachricht. Wir haben sie erhalten und melden uns in Kürze bei dir.

Mit freundlichen Grüßen,
Familien Herz Zeit`,
      htmlBody: renderLayout({
        title: "Vielen Dank für deine Nachricht",
        preheader: "Wir haben deine Nachricht erhalten",
        bodyHtml: `
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hallo {{name}},
      </p>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        vielen Dank für deine Nachricht. Wir haben sie erhalten und melden uns in Kürze bei dir.
      </p>
      <p style="margin: 20px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Mit freundlichen Grüßen,<br>
        <strong>Familien Herz Zeit</strong>
      </p>
    `,
      }),
    },
  };
}
