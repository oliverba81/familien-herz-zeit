import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { getPaymentConfig } from "@/lib/payment/config";
import { z } from "zod";
import { validateDiscount, markRedeemed } from "@/lib/discounts/engine";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCheckoutSchema = z.object({
  videoCourseId: z.string().min(1),
  discountCode: z.string().optional(),
  // § 356 Abs. 5 BGB: Zustimmung zum sofortigen Beginn + Kenntnis des
  // Erlöschens des Widerrufsrechts (Pflicht für den Kauf digitaler Inhalte).
  withdrawalConsent: z.boolean().optional(),
});

/**
 * POST /api/stripe/create-checkout-session
 * Erstellt eine Stripe Checkout Session für einen Videokurs
 */
export async function POST(request: NextRequest) {
  try {
    // Prüfe, ob Stripe als Zahlungsart aktiviert und konfiguriert ist
    const paymentConfig = await getPaymentConfig();
    if (!paymentConfig.stripe.available) {
      return NextResponse.json(
        { error: "Kartenzahlung (Stripe) ist derzeit nicht verfügbar" },
        { status: 403 }
      );
    }

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
    const validatedData = createCheckoutSchema.parse(body);

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

    // Prüfe Discount Code falls vorhanden
    let finalPriceCents = course.priceCents;
    let appliedDiscountCode: string | null = null;
    let discounts: any[] = [];

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

      appliedDiscountCode = discountResult.discount.code;

      // Für Stripe: Nutze Promotion Code wenn provider=STRIPE
      if (discountResult.discount.provider === "STRIPE" && discountResult.discount.stripePromotionCodeId) {
        discounts = [
          {
            promotion_code: discountResult.discount.stripePromotionCodeId,
          },
        ];
        // Stripe wendet Rabatt automatisch an
        finalPriceCents = course.priceCents;
      } else if (discountResult.discount.provider === "LOCAL") {
        // Für LOCAL: Reduziere Preis im line_item
        finalPriceCents = discountResult.newPriceCents;
        // Markiere als eingelöst (für LOCAL wichtig)
        await markRedeemed(discountResult.discount.id);
      }

      // Audit Log
      const actor = await getActorFromSession();
      await logAudit({
        actor,
        entity: {
          type: "VideoPurchase",
          id: "pending",
          label: `Checkout für ${course.title}`,
        },
        action: AuditAction.OTHER,
        message: `Rabattcode '${appliedDiscountCode}' angewendet (${discountResult.discountCents / 100}€ Rabatt)`,
        meta: {
          discountCode: appliedDiscountCode,
          discountCents: discountResult.discountCents,
          originalPriceCents: course.priceCents,
          finalPriceCents,
          provider: discountResult.discount.provider,
        },
      });
    }

    // Erstelle Stripe Checkout Session
    const stripe = await getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            product_data: {
              name: course.title,
              description: course.description.substring(0, 500),
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      discounts: discounts.length > 0 ? discounts : undefined,
      success_url: `${baseUrl}/videokurse/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/videokurse/${course.slug}?canceled=1`,
      metadata: {
        videoCourseId: course.id,
        appliedDiscountCode: appliedDiscountCode || "",
        withdrawalConsent: validatedData.withdrawalConsent ? "true" : "false",
      },
    });

    // Erstelle Purchase in DB (PENDING)
    try {
      await db.videoPurchase.create({
        data: {
          provider: "STRIPE",
          status: "PENDING",
          videoCourseId: course.id,
          userId: user.id,
          email: user.email, // Verwende User E-Mail
          amountCents: finalPriceCents,
          currency: course.currency.toLowerCase(),
          appliedDiscountCode: appliedDiscountCode,
          withdrawalConsent: validatedData.withdrawalConsent ?? false,
          stripeSessionId: checkoutSession.id,
        },
      });
    } catch (dbError: any) {
      console.error("Fehler beim Erstellen der Purchase:", dbError);
      // Purchase-Erstellung schlägt fehl, aber Session wurde erstellt
      // Session kann trotzdem verwendet werden, Webhook erstellt Purchase dann
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Erstellen der Checkout Session:", error);
    return NextResponse.json(
      { 
        error: "Interner Serverfehler",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

