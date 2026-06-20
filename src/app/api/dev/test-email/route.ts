import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { sendEmail } from "@/lib/email/mailer";
import { renderLayout } from "@/lib/email/templates/layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dev/test-email
 * Test-Route für E-Mail-Versand (nur in Development, nur für ADMIN)
 */
export async function GET(request: NextRequest) {
  // Nur in Development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    // Auth required (ADMIN)
    await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!process.env.MAIL_ADMIN_TO) {
      return NextResponse.json(
        { error: "MAIL_ADMIN_TO is not set" },
        { status: 500 }
      );
    }

    const testEmail = {
      subject: "Test-E-Mail von Familien Herz Zeit",
      text: "Dies ist eine Test-E-Mail. Wenn du diese erhältst, funktioniert der E-Mail-Versand korrekt.",
      html: renderLayout({
        title: "Test-E-Mail",
        preheader: "E-Mail-Versand Test",
        bodyHtml: `
          <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            Dies ist eine Test-E-Mail. Wenn du diese erhältst, funktioniert der E-Mail-Versand korrekt.
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Zeitpunkt: ${new Date().toLocaleString("de-DE")}
          </p>
        `,
      }),
    };

    const messageId = await sendEmail({
      to: process.env.MAIL_ADMIN_TO,
      ...testEmail,
    });

    return NextResponse.json({
      success: true,
      messageId,
      sentTo: process.env.MAIL_ADMIN_TO,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    console.error("Fehler beim Senden der Test-E-Mail:", error);
    return NextResponse.json(
      { error: error.message || "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

