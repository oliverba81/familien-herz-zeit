import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalFetch } from "@/lib/paypal/client";
import { generateToken } from "@/lib/utils/token";
import { sendEmail } from "@/lib/email/mailer";
import { renderVideoAccessEmail } from "@/lib/email/templates/videoAccess";
import { createInvoiceForPurchase } from "@/lib/invoice/create-invoice";
import { parseEuroToCents } from "@/lib/utils/money";
import { z } from "zod";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const captureSchema = z.object({
  orderId: z.string().min(1),
});

/**
 * POST /api/paypal/capture
 * Captured eine PayPal Order und führt Fulfillment aus
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = captureSchema.parse(body);

    await logger.info("PAYMENT", "PAYPAL_CAPTURE_STARTED", `PayPal capture started for order ${validatedData.orderId}`, {
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

    const videoCourseId = purchaseUnit?.reference_id || "";
    const captureId = capture?.id || "";
    const payerEmail =
      payer?.email_address ||
      capture?.payer?.email_address ||
      "unknown@example.com";

    // 4. Finde oder erstelle Purchase
    let purchase = await db.videoPurchase.findUnique({
      where: { paypalOrderId: validatedData.orderId },
      include: { videoCourse: true },
    });

    if (!purchase) {
      // Fallback: Erstelle Purchase wenn nicht gefunden
      const course = await db.videoCourse.findUnique({
        where: { id: videoCourseId },
      });

      if (!course) {
        return NextResponse.json(
          { error: "Videokurs nicht gefunden" },
          { status: 404 }
        );
      }

      // Hole amount aus capture (kann durch Discount reduziert sein).
      // Bei fehlendem/ungültigem Wert sicher auf den Kurspreis zurückfallen,
      // statt NaN weiterzuverarbeiten.
      const amountCents = parseEuroToCents(capture?.amount?.value) ?? course.priceCents;

      purchase = await db.videoPurchase.create({
        data: {
          provider: "PAYPAL",
          status: "PAID",
          videoCourseId: course.id,
          email: payerEmail,
          amountCents: amountCents,
          currency: "eur",
          // appliedDiscountCode wird bereits beim Create Order gesetzt
          paypalOrderId: validatedData.orderId,
          paypalCaptureId: captureId,
          paidAt: new Date(),
        },
        include: { videoCourse: true },
      });
    } else if (purchase.status === "PAID") {
      // Idempotenz: Prüfe ob Token bereits existiert
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
        // Token existiert bereits
        const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        const watchUrl = new URL(
          `/videokurse/watch/${existingToken.token}`,
          baseUrl
        ).toString();

        return NextResponse.json({
          ok: true,
          watchUrl,
          mailSent: false,
          message: "Purchase bereits abgeschlossen",
        });
      }
    } else {
      // Update Purchase auf PAID
      purchase = await db.videoPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "PAID",
          email: payerEmail,
          paypalCaptureId: captureId,
          paidAt: new Date(),
        },
        include: { videoCourse: true },
      });
    }

    // 5. Erstelle Access Token (90 Tage)
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
      provider: "PAYPAL",
      email: purchase.email,
    });

    // 6. Sende E-Mail
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const watchUrl = new URL(
      `/videokurse/watch/${token}`,
      baseUrl
    ).toString();

    let mailSent = false;
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

      mailSent = true;
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
      // E-Mail-Fehler sollte nicht den Capture fehlschlagen lassen
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
      // Rechnungsfehler sollte nicht den Capture fehlschlagen lassen
    }

    return NextResponse.json({
      ok: true,
      watchUrl,
      mailSent,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    await logger.error("PAYMENT", "PAYPAL_CAPTURE_ERROR", "Error processing PayPal capture", error instanceof Error ? error : undefined, {
      orderId: (error as any)?.orderId || "unknown",
    });
    console.error("Fehler beim Capture der PayPal Order:", error);
    return NextResponse.json(
      {
        error: "Interner Serverfehler",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

