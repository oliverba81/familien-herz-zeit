import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentConfig } from "@/lib/payment/config";
import { validateDiscount, markRedeemed } from "@/lib/discounts/engine";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  videoCourseId: z.string().min(1),
  discountCode: z.string().optional(),
});

/**
 * POST /api/video-courses/bank-transfer-order
 * Legt einen Videokurs-Kauf per Überweisung an (Status PENDING). Der Zugang wird
 * erst nach manueller Zahlungsbestätigung im Admin freigeschaltet.
 */
export async function POST(request: NextRequest) {
  try {
    // Überweisung aktiviert & konfiguriert?
    const paymentConfig = await getPaymentConfig();
    if (!paymentConfig.bankTransfer.available) {
      return NextResponse.json(
        { error: "Überweisung ist derzeit nicht verfügbar" },
        { status: 403 }
      );
    }

    // Login erforderlich (wie bei Stripe/PayPal)
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
    const { videoCourseId, discountCode } = schema.parse(body);

    const course = await db.videoCourse.findUnique({
      where: { id: videoCourseId },
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

    // Rabattcode (nur lokale Rabatte sind bei Überweisung anwendbar)
    let finalPriceCents = course.priceCents;
    let appliedDiscountCode: string | null = null;

    if (discountCode) {
      const discountResult = await validateDiscount({
        code: discountCode,
        videoCourseId: course.id,
        priceCents: course.priceCents,
      });

      if (!discountResult.ok) {
        return NextResponse.json(
          { error: "Ungültiger Rabattcode", reason: discountResult.reason },
          { status: 400 }
        );
      }

      if (discountResult.discount.provider === "LOCAL") {
        finalPriceCents = discountResult.newPriceCents;
        appliedDiscountCode = discountResult.discount.code;
        await markRedeemed(discountResult.discount.id);
      } else {
        // Stripe-Promotioncodes lassen sich bei Überweisung nicht anwenden
        return NextResponse.json(
          {
            error:
              "Dieser Rabattcode ist nur bei Kartenzahlung (Stripe) gültig.",
          },
          { status: 400 }
        );
      }
    }

    const purchase = await db.videoPurchase.create({
      data: {
        provider: "BANKTRANSFER",
        status: "PENDING",
        videoCourseId: course.id,
        userId: user.id,
        email: user.email,
        amountCents: finalPriceCents,
        currency: course.currency.toLowerCase(),
        appliedDiscountCode,
      },
    });

    return NextResponse.json({
      ok: true,
      bankTransfer: {
        accountHolder: paymentConfig.bankTransfer.accountHolder,
        iban: paymentConfig.bankTransfer.iban,
        bic: paymentConfig.bankTransfer.bic,
        bankName: paymentConfig.bankTransfer.bankName,
        info: paymentConfig.bankTransfer.info,
        amountCents: finalPriceCents,
        reference: `${course.title} – ${purchase.id}`,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Anlegen der Überweisungs-Bestellung:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
