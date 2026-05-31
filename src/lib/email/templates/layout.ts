/**
 * Basis-Layout für E-Mail-Templates
 */
export function renderLayout({
  title,
  preheader,
  bodyHtml,
}: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${preheader ? `<meta name="preheader" content="${preheader}">` : ""}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px 0; color: #e11d48; font-size: 24px; font-weight: 600;">
                ${title}
              </h1>
              ${bodyHtml}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                Familien Herz Zeit<br>
                Diese E-Mail wurde automatisch generiert.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

