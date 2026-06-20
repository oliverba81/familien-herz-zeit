import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations/contact";
import { sendEmail } from "@/lib/email/mailer";
import {
  renderContactAdminEmail,
  renderContactUserConfirmEmail,
} from "@/lib/email/templates/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifiziert reCAPTCHA Token mit Google API
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("[Contact] RECAPTCHA_SECRET_KEY nicht gesetzt, überspringe Verifizierung");
    return true; // Wenn kein Secret Key gesetzt ist, erlauben wir die Anfrage
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
    console.error("[Contact] Fehler bei reCAPTCHA-Verifizierung:", error);
    return false;
  }
}

/**
 * POST /api/contact
 * Verarbeitet Kontaktanfragen und sendet E-Mails
 */
export async function POST(request: NextRequest) {
  let mailSent = false;
  let adminMailSent = false;
  let userMailSent = false;

  try {
    const body = await request.json();

    // Validierung
    const validatedData = contactSchema.parse(body);

    // Honeypot: Wenn website Feld gefüllt ist, antworte ok aber speichere nichts
    if (validatedData.website) {
      return NextResponse.json(
        { ok: true, message: "Vielen Dank für deine Nachricht!" },
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

    // Erstelle vollständigen Namen
    const fullName = validatedData.name || 
      (validatedData.vorname && validatedData.nachname 
        ? `${validatedData.vorname} ${validatedData.nachname}` 
        : validatedData.vorname || validatedData.nachname || "");

    // Sende Admin-E-Mail
    if (process.env.MAIL_ADMIN_TO) {
      try {
        const adminEmail = renderContactAdminEmail({
          name: fullName,
          email: validatedData.email,
          message: validatedData.message,
        });

        await sendEmail({
          to: process.env.MAIL_ADMIN_TO,
          subject: adminEmail.subject,
          text: adminEmail.text,
          html: adminEmail.html,
          replyTo: validatedData.email,
        });

        adminMailSent = true;
        mailSent = true;
      } catch (error: any) {
        console.error("[Contact] Failed to send admin email:", error);
      }
    }

    // Sende Bestätigungs-E-Mail an User (optional)
    try {
      const userEmail = renderContactUserConfirmEmail({
        name: fullName,
      });

      await sendEmail({
        to: validatedData.email,
        subject: userEmail.subject,
        text: userEmail.text,
        html: userEmail.html,
      });

      userMailSent = true;
      mailSent = true;
    } catch (error: any) {
      console.error("[Contact] Failed to send user confirmation email:", error);
    }

    return NextResponse.json({
      ok: true,
      mailSent,
      message: "Vielen Dank für deine Nachricht!",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Fehler beim Verarbeiten der Kontaktanfrage:", error);
    return NextResponse.json(
      {
        ok: true,
        mailSent: false,
        error: "Nachricht wurde empfangen, aber E-Mail-Versand fehlgeschlagen",
      },
      { status: 200 }
    );
  }
}

