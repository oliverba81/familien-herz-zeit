import { NextRequest, NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/utils/token";
import { sendEmail } from "@/lib/email/mailer";
import { renderVideoAccessEmail } from "@/lib/email/templates/videoAccess";
import { createInvoiceForPurchase } from "@/lib/invoice/create-invoice";
import { getChildAgeMonths } from "@/lib/utils/age";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 * Verarbeitet Stripe Webhook Events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event;

  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    await logger.error("PAYMENT", "STRIPE_WEBHOOK_SIGNATURE_FAILED", "Webhook signature verification failed", err, {
      errorMessage: err.message,
    });
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Behandle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    await logger.info("PAYMENT", "STRIPE_WEBHOOK_RECEIVED", `Stripe webhook event: ${event.type}`, {
      eventId: event.id,
      sessionId: session.id,
    });

    try {
      // Prüfe ob es eine Course-Booking oder Video-Purchase ist
      const bookingType = session.metadata?.type;
      
      if (bookingType === "course_booking") {
        // Handle Course Booking
        console.log("[Stripe Webhook] Course booking detected, session ID:", session.id);
        const bookingDataStr = session.metadata?.bookingData;
        if (!bookingDataStr) {
          console.error("[Stripe Webhook] Missing bookingData in session metadata");
          return NextResponse.json({ received: true });
        }

        let bookingData;
        try {
          bookingData = JSON.parse(bookingDataStr);
        } catch (parseError) {
          // Nicht still verschlucken: strukturiert protokollieren, damit eine
          // fehlgeschlagene Buchung sichtbar wird (sonst denkt der Kunde, die
          // Zahlung sei erfolgreich verbucht).
          await logger.error(
            "PAYMENT",
            "STRIPE_WEBHOOK_BOOKINGDATA_PARSE_FAILED",
            `Failed to parse bookingData for session ${session.id}`,
            parseError instanceof Error ? parseError : undefined,
            { sessionId: session.id }
          );
          console.error("Failed to parse bookingData:", parseError);
          return NextResponse.json({ received: true });
        }

        const courseId = bookingData.courseId;
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
          console.error("Course not found:", courseId);
          return NextResponse.json({ received: true });
        }

        // Prüfe ob Booking bereits existiert (Idempotenz)
        const existingBooking = await db.booking.findFirst({
          where: {
            stripeSessionId: session.id,
          },
        });

        if (existingBooking) {
          console.log("Booking already exists for this session");
          return NextResponse.json({ received: true });
        }

        // Finde erste zukünftige Session
        const now = new Date();
        const firstSession = course.sessions.find(
          (s) => new Date(s.startAt) >= now
        );

        // Berechne Alter in Monaten (zentrale, getestete Funktion)
        const birthDate = new Date(bookingData.childBirthDate);
        const childAgeMonths = getChildAgeMonths(birthDate);

        // Erstelle Booking
        const amountPaid = session.amount_total || course.priceCents;
        
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
            paymentProvider: "STRIPE",
            paymentStatus: "COMPLETED",
            stripeSessionId: session.id,
            amountPaidCents: amountPaid,
          },
        });

        console.log("[Stripe Webhook] Booking created successfully:", {
          bookingId: booking.id,
          courseId: courseId,
          status: booking.status,
          paymentProvider: booking.paymentProvider,
          parentName: booking.parentName,
        });

        await logger.success("PAYMENT", "COURSE_BOOKING_CREATED", `Course booking created via Stripe: ${booking.id}`, {
          bookingId: booking.id,
          courseId: courseId,
          amountCents: amountPaid,
          email: bookingData.email,
        });

        // Sende Bestätigungs-E-Mail (falls konfiguriert)
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

        return NextResponse.json({ received: true });
      }

      // Original Video Purchase Logic
      const videoCourseId = session.metadata?.videoCourseId;
      if (!videoCourseId) {
        console.error("Missing videoCourseId in session metadata");
        return NextResponse.json({ received: true });
      }

      const email =
        session.customer_details?.email || session.customer_email || "";
      if (!email) {
        // Keine E-Mail -> kein Zugang möglich. Nicht still verschlucken,
        // sondern sichtbar protokollieren (kein VideoPurchase mit leerer E-Mail).
        await logger.error(
          "PAYMENT",
          "STRIPE_WEBHOOK_MISSING_EMAIL",
          `Missing email in checkout session ${session.id}`,
          undefined,
          { sessionId: session.id, videoCourseId }
        );
        console.error("Missing email in session");
        return NextResponse.json({ received: true });
      }

      // Finde oder erstelle Purchase
      let purchase = await db.videoPurchase.findUnique({
        where: { stripeSessionId: session.id },
        include: { videoCourse: true },
      });

      if (!purchase) {
        // Falls Purchase nicht existiert, erstelle es
        const course = await db.videoCourse.findUnique({
          where: { id: videoCourseId },
        });

        if (!course) {
          console.error("Course not found:", videoCourseId);
          return NextResponse.json({ received: true });
        }

        // Hole appliedDiscountCode aus Session Metadata
        const appliedDiscountCode = session.metadata?.appliedDiscountCode || null;
        // Hole final amount aus session (kann durch Stripe Promotion Code reduziert sein)
        const amountTotal = session.amount_total || course.priceCents;

        purchase = await db.videoPurchase.create({
          data: {
            provider: "STRIPE",
            status: "PAID",
            videoCourseId: course.id,
            email,
            amountCents: amountTotal,
            appliedDiscountCode: appliedDiscountCode || undefined,
            currency: session.currency || "eur",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string | null,
            paidAt: new Date(),
          },
          include: { videoCourse: true },
        });
      } else if (purchase.status === "PAID") {
        // Purchase bereits PAID - prüfe ob Token existiert (Idempotenz)
        const existingToken = await db.videoAccessToken.findFirst({
          where: {
            videoCourseId: purchase.videoCourseId,
            email: purchase.email,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (existingToken) {
          // Token existiert bereits, keine E-Mail erneut senden
          console.log("Token already exists for this purchase, skipping");
          return NextResponse.json({ received: true });
        }
      } else {
        // Update Purchase auf PAID
        // Hole appliedDiscountCode und amountTotal aus Session
        const appliedDiscountCode = session.metadata?.appliedDiscountCode || null;
        const amountTotal = session.amount_total || purchase.amountCents;

        purchase = await db.videoPurchase.update({
          where: { id: purchase.id },
          data: {
            status: "PAID",
            email,
            amountCents: amountTotal,
            appliedDiscountCode: appliedDiscountCode || undefined,
            stripePaymentIntentId: session.payment_intent as string | null,
            paidAt: new Date(),
          },
          include: { videoCourse: true },
        });
      }

      // Erstelle Access Token (90 Tage Gültigkeit)
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      await db.videoAccessToken.create({
        data: {
          token,
          videoCourseId: purchase.videoCourseId,
          email: purchase.email,
          expiresAt,
        },
      });

      await logger.success("PAYMENT", "PAYMENT_COMPLETED", `Payment completed for purchase ${purchase.id}`, {
        purchaseId: purchase.id,
        videoCourseId: purchase.videoCourseId,
        amountCents: purchase.amountCents,
        provider: "STRIPE",
        email: purchase.email,
      });

      // Sende E-Mail mit Access-Link
      const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
      const watchUrl = new URL(
        `/videokurse/watch/${token}`,
        baseUrl
      ).toString();

      try {
        const emailContent = renderVideoAccessEmail({
          courseTitle: purchase.videoCourse.title,
          watchUrl,
          expiresAt,
        });

        await sendEmail({
          to: purchase.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });
      } catch (emailError: any) {
        await logger.warning(
          "PAYMENT",
          "EMAIL_SEND_FAILED",
          `Failed to send access email for purchase ${purchase.id}`,
          undefined,
          emailError instanceof Error ? emailError : undefined,
          {
            purchaseId: purchase.id,
            email: purchase.email,
          }
        );
        console.error("Failed to send access email:", emailError);
        // E-Mail-Fehler sollte nicht den Webhook fehlschlagen lassen
      }

      // Erstelle Rechnung automatisch
      try {
        // Finde User anhand E-Mail
        const user = await db.user.findUnique({
          where: { email: purchase.email },
        });

        if (user) {
          // Update Purchase mit userId falls noch nicht gesetzt
          if (!purchase.userId) {
            await db.videoPurchase.update({
              where: { id: purchase.id },
              data: { userId: user.id },
            });
          }

          // Generiere Rechnung (interne Funktion, kein Auth nötig)
          await createInvoiceForPurchase(purchase.id);
          await logger.success("PAYMENT", "INVOICE_GENERATED", `Invoice generated for purchase ${purchase.id}`, {
            purchaseId: purchase.id,
            invoiceNumber: (await db.invoice.findUnique({ where: { purchaseId: purchase.id } }))?.invoiceNumber,
          });
        }
      } catch (invoiceError: any) {
        await logger.error("PAYMENT", "INVOICE_GENERATION_FAILED", `Failed to generate invoice for purchase ${purchase.id}`, invoiceError, {
          purchaseId: purchase.id,
        });
        console.error("Failed to generate invoice:", invoiceError);
        // Rechnungsfehler sollte nicht den Webhook fehlschlagen lassen
      }

      return NextResponse.json({ received: true });
    } catch (error: any) {
      await logger.error("PAYMENT", "STRIPE_WEBHOOK_PROCESSING_ERROR", "Error processing checkout.session.completed", error, {
        eventType: event.type,
        eventId: event.id,
      });
      console.error("Error processing checkout.session.completed:", error);
      // Webhook sollte 200 zurückgeben, auch bei Fehlern (Stripe retry)
      return NextResponse.json({ received: true });
    }
  }

  // Optional: Weitere Events behandeln
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as any;
    await db.videoPurchase.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "FAILED" },
    });
  }

  return NextResponse.json({ received: true });
}

