import { NextRequest, NextResponse } from "next/server";
import { widerrufSchema } from "@/lib/validations/widerruf";
import { sendEmail } from "@/lib/email/mailer";
import {
  renderWiderrufAdminEmail,
  renderWiderrufUserConfirmEmail,
} from "@/lib/email/templates/widerruf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifiziert reCAPTCHA Token mit Google API
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn("[Widerruf] RECAPTCHA_SECRET_KEY nicht gesetzt, überspringe Verifizierung");
    return true;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("[Widerruf] Fehler bei reCAPTCHA-Verifizierung:", error);
    return false;
  }
}

/**
 * POST /api/widerruf
 * Nimmt einen Widerruf über die elektronische Widerrufsfunktion (§ 356a BGB)
 * entgegen, benachrichtigt die Anbieterin und bestätigt dem Verbraucher den
 * Eingang auf einem dauerhaften Datenträger (E-Mail).
 */
export async function POST(request: NextRequest) {
  let mailSent = false;

  try {
    const body = await request.json();

    // Validierung
    const validatedData = widerrufSchema.parse(body);

    // Honeypot: Wenn website Feld gefüllt ist, antworte ok aber tue nichts
    if (validatedData.website) {
      return NextResponse.json(
        { ok: true, message: "Dein Widerruf ist eingegangen." },
        { status: 200 }
      );
    }

    // reCAPTCHA-Verifizierung (wenn Token vorhanden)
    if (validatedData.recaptchaToken) {
      const isValid = await verifyRecaptcha(validatedData.recaptchaToken);
      if (!isValid) {
        return NextResponse.json(
          { error: "reCAPTCHA-Verifizierung fehlgeschlagen" },
          { status: 400 }
        );
      }
    }

    const fields = {
      contractReference: validatedData.contractReference,
      email: validatedData.email,
      name: validatedData.name,
      contractType: validatedData.contractType,
      contractDate: validatedData.contractDate,
      message: validatedData.message,
    };

    // Sende Admin-Benachrichtigung
    if (process.env.MAIL_ADMIN_TO) {
      try {
        const adminEmail = renderWiderrufAdminEmail(fields);
        await sendEmail({
          to: process.env.MAIL_ADMIN_TO,
          subject: adminEmail.subject,
          text: adminEmail.text,
          html: adminEmail.html,
          replyTo: validatedData.email,
        });
        mailSent = true;
      } catch (error: any) {
        console.error("[Widerruf] Failed to send admin email:", error);
      }
    }

    // Eingangsbestätigung an den Verbraucher (auf dauerhaftem Datenträger)
    try {
      const userEmail = renderWiderrufUserConfirmEmail(fields);
      await sendEmail({
        to: validatedData.email,
        subject: userEmail.subject,
        text: userEmail.text,
        html: userEmail.html,
      });
      mailSent = true;
    } catch (error: any) {
      console.error("[Widerruf] Failed to send user confirmation email:", error);
    }

    return NextResponse.json({
      ok: true,
      mailSent,
      message: "Dein Widerruf ist eingegangen. Wir haben dir eine Eingangsbestätigung gesendet.",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Widerruf] Fehler beim Verarbeiten des Widerrufs:", error);
    return NextResponse.json(
      {
        ok: true,
        mailSent: false,
        error: "Widerruf empfangen, aber E-Mail-Versand fehlgeschlagen",
      },
      { status: 200 }
    );
  }
}
