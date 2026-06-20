import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { paypalFetch } from "@/lib/paypal/client";
import { z } from "zod";
import { validateDiscount, markRedeemed } from "@/lib/discounts/engine";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  videoCourseId: z.string().min(1),
  discountCode: z.string().optional(),
});

/**
 * POST /api/paypal/create-order
 * Erstellt eine PayPal Order für einen Videokurs
 */
export async function POST(request: NextRequest) {
  try {
    // Prüfe ob User eingeloggt ist
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Bitte melde dich an, um einen Kurs zu kaufen" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Nur Kunden können Kurse kaufen" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Lade Videokurs
    const course = await db.videoCourse.findUnique({
      where: { id: validatedData.videoCourseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    if (course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Videokurs ist nicht verfügbar" },
        { status: 409 }
      );
    }

    if (course.priceCents <= 0) {
      return NextResponse.json(
        { error: "Dieser Kurs kann nicht gekauft werden" },
        { status: 409 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    // Prüfe Discount Code falls vorhanden (nur LOCAL für PayPal)
    let finalPriceCents = course.priceCents;
    let appliedDiscountCode: string | null = null;

    if (validatedData.discountCode) {
      const discountResult = await validateDiscount({
        code: validatedData.discountCode,
        videoCourseId: course.id,
        priceCents: course.priceCents,
      });

      if (!discountResult.ok) {
        return NextResponse.json(
          {
            error: "Ungültiger Rabattcode",
            reason: discountResult.reason,
          },
          { status: 400 }
        );
      }

      // Für PayPal nur LOCAL Codes akzeptieren
      if (discountResult.discount.provider !== "LOCAL") {
        return NextResponse.json(
          {
            error: "Dieser Rabattcode kann nur bei Stripe verwendet werden",
          },
          { status: 400 }
        );
      }

      appliedDiscountCode = discountResult.discount.code;
      finalPriceCents = discountResult.newPriceCents;

      // Markiere als eingelöst
      await markRedeemed(discountResult.discount.id);

      // Audit Log
      const actor = await getActorFromSession();
      await logAudit({
        actor,
        entity: {
          type: "VideoPurchase",
          id: "pending",
          label: `PayPal Order für ${course.title}`,
        },
        action: AuditAction.OTHER,
        message: `Rabattcode '${appliedDiscountCode}' angewendet (${discountResult.discountCents / 100}€ Rabatt)`,
        meta: {
          discountCode: appliedDiscountCode,
          discountCents: discountResult.discountCents,
          originalPriceCents: course.priceCents,
          finalPriceCents,
          provider: "LOCAL",
        },
      });
    }

    const amountValue = (finalPriceCents / 100).toFixed(2);

    // Erstelle PayPal Order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: course.id,
          amount: {
            currency_code: "EUR",
            value: amountValue,
          },
        },
      ],
      application_context: {
        return_url: `${baseUrl}/videokurse/paypal/success?courseId=${course.id}`,
        cancel_url: `${baseUrl}/videokurse/paypal/cancel?courseId=${course.id}`,
        brand_name: "Familien Herz Zeit",
        user_action: "PAY_NOW",
      },
    };

    const order = await paypalFetch("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    // Finde approve URL
    const approveLink = order.links?.find(
      (link: any) => link.rel === "approve"
    );

    if (!approveLink || !approveLink.href) {
      throw new Error("PayPal approve URL nicht gefunden");
    }

    // Erstelle Purchase in DB (PENDING)
    try {
      await db.videoPurchase.create({
        data: {
          provider: "PAYPAL",
          status: "PENDING",
          videoCourseId: course.id,
          userId: user.id,
          email: user.email, // Verwende User E-Mail
          amountCents: finalPriceCents,
          currency: "eur",
          appliedDiscountCode: appliedDiscountCode,
          paypalOrderId: order.id,
        },
      });
    } catch (dbError: any) {
      console.error("Fehler beim Erstellen der Purchase:", dbError);
      // Purchase-Erstellung schlägt fehl, aber Order wurde erstellt
      // Capture kann Purchase dann erstellen
    }

    return NextResponse.json({
      approveUrl: approveLink.href,
      orderId: order.id,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Erstellen der PayPal Order:", error);
    return NextResponse.json(
      {
        error: "Interner Serverfehler",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

