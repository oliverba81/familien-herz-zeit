import { NextRequest, NextResponse } from "next/server";
import { getPaymentConfig } from "@/lib/payment/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy imports um Import-Fehler zu vermeiden
async function getDb() {
  try {
    const { db } = await import("@/lib/db");
    return db;
  } catch (error: any) {
    console.error("[Booking API] Failed to import db:", error);
    throw new Error("Datenbank-Modul konnte nicht geladen werden");
  }
}

async function getBookingSchema() {
  try {
    const { bookingSchema } = await import("@/lib/validations/bookings");
    return bookingSchema;
  } catch (error: any) {
    console.error("[Booking API] Failed to import bookingSchema:", error);
    throw new Error("Validierungs-Schema konnte nicht geladen werden");
  }
}

async function getEmailFunctions() {
  try {
    const mailer = await import("@/lib/email/mailer");
    const templateRenderer = await import("@/lib/email/template-renderer");
    
    // Prüfe ob E-Mail konfiguriert ist
    const isConfigured = mailer.isEmailConfigured?.() ?? false;
    
    // Wrapper-Funktionen, die die alten Signaturen beibehalten
    const renderBookingUserEmail = async (params: {
      courseTitle: string;
      startAt: Date;
      parentName: string;
      bookingId: string;
      priceCents: number;
    }) => {
      return await templateRenderer.renderEmailTemplate("booking_user", {
        courseTitle: params.courseTitle,
        startAt: params.startAt,
        parentName: params.parentName,
        bookingId: params.bookingId,
        priceCents: params.priceCents,
      });
    };

    const renderBookingAdminEmail = async (params: {
      courseTitle: string;
      startAt: Date;
      parentName: string;
      email: string;
      bookingId: string;
    }) => {
      return await templateRenderer.renderEmailTemplate("booking_admin", {
        courseTitle: params.courseTitle,
        startAt: params.startAt,
        parentName: params.parentName,
        email: params.email,
        bookingId: params.bookingId,
      });
    };
    
    return {
      sendEmail: isConfigured ? mailer.sendEmail : null,
      renderBookingUserEmail,
      renderBookingAdminEmail,
      isConfigured,
    };
  } catch (error: any) {
    console.error("[Booking API] Failed to import email functions:", error);
    // E-Mail-Funktionen sind optional
    return {
      sendEmail: null,
      renderBookingUserEmail: null,
      renderBookingAdminEmail: null,
      isConfigured: false,
    };
  }
}

/**
 * POST /api/bookings
 * Erstellt eine neue Buchung (public, kein auth)
 */
export async function POST(request: NextRequest) {
  // Lade Module lazy, um Import-Fehler zu vermeiden
  let db, bookingSchema, emailFunctions;
  try {
    db = await getDb();
    bookingSchema = await getBookingSchema();
    emailFunctions = await getEmailFunctions();
  } catch (importError: any) {
    console.error("[Booking API] Import error:", importError);
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler", details: importError.message },
      { status: 500 }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      console.error("[Booking API] JSON parsing error:", jsonError);
      return NextResponse.json(
        { error: "Ungültiges JSON-Format" },
        { status: 400 }
      );
    }
    
    // Validierung
    let validatedData;
    try {
      validatedData = bookingSchema.parse(body);
    } catch (validationError: any) {
      console.error("[Booking API] Validation error:", validationError);
      if (validationError.name === "ZodError") {
        return NextResponse.json(
          { error: "Validierungsfehler", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Honeypot: Wenn website Feld gefüllt ist, antworte ok aber speichere nichts
    if (validatedData.website) {
      return NextResponse.json(
        { message: "Vielen Dank für deine Buchung!" },
        { status: 200 }
      );
    }

    // Zahlungsart "Überweisung": Buchung wird mit Status PENDING angelegt,
    // die Bankdaten werden in der Antwort mitgeschickt (Anzeige im Formular).
    const isBankTransfer = body?.paymentMethod === "BANKTRANSFER";
    let paymentConfig = null;
    if (isBankTransfer) {
      paymentConfig = await getPaymentConfig();
      if (!paymentConfig.bankTransfer.available) {
        return NextResponse.json(
          { error: "Überweisung ist derzeit nicht verfügbar" },
          { status: 403 }
        );
      }
    }

    // Prüfe ob Kurs existiert
    let course;
    try {
      course = await db.course.findUnique({
        where: { id: validatedData.courseId },
      });
    } catch (dbError: any) {
      console.error("[Booking API] Database error (findUnique):", dbError);
      return NextResponse.json(
        { error: "Datenbankfehler beim Laden des Kurses" },
        { status: 500 }
      );
    }

    if (!course) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Prüfe Kurs-Status
    if (course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Kurs ist nicht verfügbar" },
        { status: 400 }
      );
    }

    // Prüfe AOK-Gutschein: Nur akzeptieren, wenn Kurs AOK-Gutscheine akzeptiert
    if (validatedData.hasAokVoucher && !course.acceptsAokVoucher) {
      return NextResponse.json(
        { error: "Dieser Kurs akzeptiert keine AOK-Gutscheine" },
        { status: 400 }
      );
    }

    // Prüfe ob Kurs in der Zukunft liegt (mindestens eine Session)
    const now = new Date();
    let futureSessions;
    try {
      futureSessions = await db.courseSession.count({
        where: {
          courseId: course.id,
          startAt: {
            gte: now,
          },
        },
      });
    } catch (dbError: any) {
      console.error("[Booking API] Database error (count sessions):", dbError);
      return NextResponse.json(
        { error: "Datenbankfehler beim Prüfen der Kurs-Sessions" },
        { status: 500 }
      );
    }

    if (futureSessions === 0) {
      return NextResponse.json(
        { error: "Kurs liegt bereits in der Vergangenheit oder hat keine zukünftigen Termine" },
        { status: 400 }
      );
    }

    // Prüfe Kapazität
    let bookingCount;
    try {
      bookingCount = await db.booking.count({
        where: {
          courseId: course.id,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      });
    } catch (dbError: any) {
      console.error("[Booking API] Database error (count bookings):", dbError);
      return NextResponse.json(
        { error: "Datenbankfehler beim Prüfen der Kapazität" },
        { status: 500 }
      );
    }

    if (bookingCount >= course.maxParticipants) {
      return NextResponse.json(
        { error: "Kurs ist ausgebucht" },
        { status: 409 }
      );
    }

    // Berechne Alter in Monaten aus Geburtsdatum (für Backward Compatibility)
    const birthDate = new Date(validatedData.childBirthDate);
    const today = new Date();
    const monthsDiff = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    const childAgeMonths = monthsDiff >= 0 ? monthsDiff : 0;

    // Erstelle Buchung
    let booking;
    try {
      booking = await db.booking.create({
        data: {
          courseId: validatedData.courseId,
          // Neue Felder
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          street: validatedData.street,
          zipCode: validatedData.zipCode,
          city: validatedData.city,
          email: validatedData.email,
          phone: validatedData.phone,
          hasAokVoucher: validatedData.hasAokVoucher,
          childFirstName: validatedData.childFirstName,
          childLastName: validatedData.childLastName,
          childBirthDate: new Date(validatedData.childBirthDate),
          childNotes: validatedData.childNotes || null,
          howDidYouHear: validatedData.howDidYouHear || null,
          privacyAccepted: validatedData.privacyAccepted,
          termsAccepted: validatedData.termsAccepted,
          // Legacy-Felder (für Backward Compatibility)
          parentName: `${validatedData.firstName} ${validatedData.lastName}`,
          childName: `${validatedData.childFirstName} ${validatedData.childLastName}`,
          childAgeMonths: childAgeMonths,
          status: "PENDING",
          // Überweisung: offene Zahlung vermerken (Admin bestätigt Zahlungseingang).
          // amountPaidCents bleibt leer, bis der Zahlungseingang bestätigt ist.
          ...(isBankTransfer
            ? {
                paymentProvider: "BANKTRANSFER",
                paymentStatus: "PENDING",
              }
            : {}),
        },
      });
    } catch (dbError: any) {
      console.error("[Booking API] Database error (create):", dbError);
      // Prüfe auf Unique Constraint Violation (Doppelbuchung)
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Du hast bereits eine Buchung für diesen Kurs" },
          { status: 409 }
        );
      }
      throw dbError;
    }

    let mailSent = false;

    // Hole erste zukünftige Session für E-Mail
    let firstSession;
    try {
      firstSession = await db.courseSession.findFirst({
        where: {
          courseId: course.id,
          startAt: {
            gte: now,
          },
        },
        orderBy: {
          startAt: "asc",
        },
      });
    } catch (dbError: any) {
      console.error("[Booking API] Database error (findFirst session):", dbError);
      // Session ist optional für E-Mail, daher nicht kritisch
      firstSession = null;
    }

    // Sende Bestätigungs-E-Mail an User
    if (emailFunctions.sendEmail && emailFunctions.renderBookingUserEmail && emailFunctions.isConfigured) {
      try {
        // Stelle sicher, dass die E-Mail-Adresse vorhanden und gültig ist
        const recipientEmail = validatedData.email?.trim();
        if (!recipientEmail) {
          console.error("[Booking] E-Mail-Adresse fehlt oder ist leer!");
          throw new Error("E-Mail-Adresse fehlt");
        }

        console.log(`[Booking] Sending user confirmation email to: ${recipientEmail}`);

        const userEmail = await emailFunctions.renderBookingUserEmail({
          courseTitle: course.title,
          startAt: firstSession?.startAt || new Date(), // Fallback falls keine Session gefunden
          parentName: `${validatedData.firstName} ${validatedData.lastName}`,
          bookingId: booking.id,
          priceCents: course.priceCents,
        });

        await emailFunctions.sendEmail({
          to: recipientEmail,
          subject: userEmail.subject,
          text: userEmail.text,
          html: userEmail.html,
        });

        console.log(`[Booking] User confirmation email sent successfully to: ${recipientEmail}`);
        mailSent = true;
      } catch (error: any) {
        console.error("[Booking] Failed to send user email:", error);
        // Logge den spezifischen Fehler für Debugging
        if (error.message?.includes("Missing required environment variable")) {
          console.error("[Booking] E-Mail-Konfiguration fehlt. Bitte SMTP-Umgebungsvariablen in .env setzen.");
        }
      }
    } else {
      console.warn("[Booking] E-Mail-Versand nicht konfiguriert. SMTP-Umgebungsvariablen fehlen.");
    }

    // Optional: Sende Admin-Benachrichtigung
    if (process.env.MAIL_ADMIN_TO && emailFunctions.sendEmail && emailFunctions.renderBookingAdminEmail) {
      try {
        const adminEmail = await emailFunctions.renderBookingAdminEmail({
          courseTitle: course.title,
          startAt: firstSession?.startAt || new Date(), // Fallback falls keine Session gefunden
          parentName: `${validatedData.firstName} ${validatedData.lastName}`,
          email: validatedData.email,
          bookingId: booking.id,
        });

        const adminRecipient = process.env.MAIL_ADMIN_TO;
        console.log(`[Booking] Sending admin notification email to: ${adminRecipient}`);

        await emailFunctions.sendEmail({
          to: adminRecipient,
          subject: adminEmail.subject,
          text: adminEmail.text,
          html: adminEmail.html,
        });

        console.log(`[Booking] Admin notification email sent successfully to: ${adminRecipient}`);
      } catch (error: any) {
        console.error("[Booking] Failed to send admin email:", error);
      }
    }

    // Bankdaten für die Überweisungs-Anzeige zusammenstellen
    let bankTransfer = null;
    if (isBankTransfer && paymentConfig) {
      const amountCents = validatedData.hasAokVoucher ? 0 : course.priceCents;
      bankTransfer = {
        accountHolder: paymentConfig.bankTransfer.accountHolder,
        iban: paymentConfig.bankTransfer.iban,
        bic: paymentConfig.bankTransfer.bic,
        bankName: paymentConfig.bankTransfer.bankName,
        info: paymentConfig.bankTransfer.info,
        amountCents,
        // Verwendungszweck: Kurs + Buchungsreferenz
        reference: `${course.title} – ${booking.id}`,
      };
    }

    return NextResponse.json(
      {
        ...booking,
        mailSent,
        bankTransfer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Log den vollständigen Fehler für Debugging
    console.error("[Booking API] Unexpected error:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      cause: error?.cause,
    });

    // Stelle sicher, dass wir immer JSON zurückgeben
    // Auch wenn ein unerwarteter Fehler auftritt
    try {
      if (error.name === "ZodError") {
        return NextResponse.json(
          { error: "Validierungsfehler", details: error.errors },
          { status: 400 }
        );
      }
      
      // Prüfe auf Unique Constraint Violation (Doppelbuchung)
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Du hast bereits eine Buchung für diesen Kurs" },
          { status: 409 }
        );
      }

      // Prüfe auf Datenbankverbindungsfehler
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.message?.includes("connect")) {
        return NextResponse.json(
          { error: "Datenbankverbindung fehlgeschlagen" },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { 
          error: "Interner Serverfehler", 
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 }
      );
    } catch (responseError: any) {
      // Falls selbst das Erstellen der Response fehlschlägt, logge es
      console.error("[Booking API] Failed to create error response:", responseError);
      // Versuche trotzdem eine Response zu erstellen
      return new NextResponse(
        JSON.stringify({ error: "Kritischer Serverfehler" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
}

