import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalFetch } from "@/lib/paypal/client";
import { z } from "zod";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const captureSchema = z.object({
  orderId: z.string().min(1),
  bookingData: z.any(), // Booking data from frontend
});

/**
 * POST /api/course-bookings/paypal-capture
 * Captured eine PayPal Order für eine Kursbuchung und erstellt die Buchung
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = captureSchema.parse(body);

    await logger.info("PAYMENT", "PAYPAL_CAPTURE_COURSE_BOOKING_STARTED", `PayPal capture started for course booking order ${validatedData.orderId}`, {
      orderId: validatedData.orderId,
    });

    // 1. PayPal Capture
    const captureResponse = await paypalFetch(
      `/v2/checkout/orders/${validatedData.orderId}/capture`,
      {
        method: "POST",
      }
    );

    // 2. Prüfe Status
    const orderStatus = captureResponse.status;
    const captureStatus =
      captureResponse.purchase_units?.[0]?.payments?.captures?.[0]?.status;

    if (orderStatus !== "COMPLETED" && captureStatus !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          reason: "NOT_COMPLETED",
          status: orderStatus,
          captureStatus,
        },
        { status: 409 }
      );
    }

    // 3. Ermittle Daten
    const purchaseUnit = captureResponse.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const payer = captureResponse.payer;

    // bookingData sollte aus dem Request kommen (vom Frontend aus Cookie/sessionStorage)
    const bookingData = validatedData.bookingData;
    
    if (!bookingData) {
      return NextResponse.json(
        { error: "Buchungsdaten nicht gefunden. Bitte versuche es erneut oder kontaktiere uns." },
        { status: 400 }
      );
    }

    const courseId = purchaseUnit?.reference_id || bookingData.courseId;
    const captureId = capture?.id || "";
    const payerEmail =
      payer?.email_address ||
      capture?.payer?.email_address ||
      bookingData.email;

    // 4. Lade Kurs
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        sessions: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    // 5. Prüfe ob Booking bereits existiert (Idempotenz)
    const existingBooking = await db.booking.findFirst({
      where: {
        paypalOrderId: validatedData.orderId,
      },
    });

    if (existingBooking) {
      console.log("Booking already exists for this order");
      return NextResponse.json({ 
        ok: true, 
        bookingId: existingBooking.id,
        message: "Booking already exists" 
      });
    }

    // 6. Finde erste zukünftige Session
    const now = new Date();
    const firstSession = course.sessions.find(
      (s) => new Date(s.startAt) >= now
    );

    // 7. Berechne Alter in Monaten
    const birthDate = new Date(bookingData.childBirthDate);
    const today = new Date();
    const monthsDiff = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    const childAgeMonths = monthsDiff >= 0 ? monthsDiff : 0;

    // 8. Hole amount aus capture
    const amountValue = capture?.amount?.value || (course.priceCents / 100).toFixed(2);
    const amountCents = Math.round(parseFloat(amountValue) * 100);

    // 9. Erstelle Booking
    const booking = await db.booking.create({
      data: {
        courseId: courseId,
        sessionId: firstSession?.id || null,
        firstName: bookingData.firstName,
        lastName: bookingData.lastName,
        street: bookingData.street,
        zipCode: bookingData.zipCode,
        city: bookingData.city,
        email: bookingData.email,
        phone: bookingData.phone,
        hasAokVoucher: bookingData.hasAokVoucher || false,
        childFirstName: bookingData.childFirstName,
        childLastName: bookingData.childLastName,
        childBirthDate: new Date(bookingData.childBirthDate),
        childNotes: bookingData.childNotes || null,
        howDidYouHear: bookingData.howDidYouHear || null,
        privacyAccepted: bookingData.privacyAccepted || false,
        termsAccepted: bookingData.termsAccepted || false,
        parentName: `${bookingData.firstName} ${bookingData.lastName}`,
        childName: `${bookingData.childFirstName} ${bookingData.childLastName}`,
        childAgeMonths: childAgeMonths,
        status: "PENDING", // Wird später vom Admin bestätigt
        paymentProvider: "PAYPAL",
        paymentStatus: "COMPLETED",
        paypalOrderId: validatedData.orderId,
        amountPaidCents: amountCents,
      },
    });

    await logger.success("PAYMENT", "COURSE_BOOKING_CREATED", `Course booking created via PayPal: ${booking.id}`, {
      bookingId: booking.id,
      courseId: courseId,
      amountCents: amountCents,
      email: bookingData.email,
    });

    // 10. Sende Bestätigungs-E-Mail (falls konfiguriert)
    try {
      const { renderEmailTemplate } = await import("@/lib/email/template-renderer");
      const { sendEmail, isEmailConfigured } = await import("@/lib/email/mailer");
      
      if (isEmailConfigured()) {
        const userEmail = await renderEmailTemplate("booking_user", {
          courseTitle: course.title,
          startAt: firstSession?.startAt || new Date(),
          parentName: `${bookingData.firstName} ${bookingData.lastName}`,
          bookingId: booking.id,
          priceCents: course.priceCents,
        });

        await sendEmail({
          to: bookingData.email,
          subject: userEmail.subject,
          text: userEmail.text,
          html: userEmail.html,
        });

        // Optional: Admin-Benachrichtigung
        if (process.env.MAIL_ADMIN_TO) {
          const adminEmail = await renderEmailTemplate("booking_admin", {
            courseTitle: course.title,
            startAt: firstSession?.startAt || new Date(),
            parentName: `${bookingData.firstName} ${bookingData.lastName}`,
            email: bookingData.email,
            bookingId: booking.id,
          });

          await sendEmail({
            to: process.env.MAIL_ADMIN_TO,
            subject: adminEmail.subject,
            text: adminEmail.text,
            html: adminEmail.html,
          });
        }
      }
    } catch (emailError: any) {
      await logger.warning(
        "PAYMENT",
        "BOOKING_EMAIL_SEND_FAILED",
        `Failed to send booking email for ${booking.id}`,
        undefined,
        emailError instanceof Error ? emailError : undefined,
        {
          bookingId: booking.id,
          email: bookingData.email,
        }
      );
      console.error("Failed to send booking email:", emailError);
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      message: "Booking created successfully",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Ungültige Eingabedaten",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    await logger.error("PAYMENT", "PAYPAL_CAPTURE_COURSE_BOOKING_ERROR", "Error capturing PayPal order for course booking", error, {
      errorMessage: error.message,
    });

    console.error("Error capturing PayPal order for course booking:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Verarbeiten der Zahlung" },
      { status: 500 }
    );
  }
}

