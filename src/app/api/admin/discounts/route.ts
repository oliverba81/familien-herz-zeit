import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { discountCodeSchema } from "@/lib/validations/discounts";
import { DiscountProvider } from "@prisma/client";
import { createStripeCouponAndPromo } from "@/lib/stripe/discounts";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discounts
 * Liste aller Rabattcodes
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const discounts = await db.discountCode.findMany({
      include: {
        videoCourse: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(discounts);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/discounts
 * Erstellt einen neuen Rabattcode
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const body = await request.json();
    const validatedData = discountCodeSchema.parse(body);

    // Normalisiere Code (uppercase)
    const normalizedCode = validatedData.code.toUpperCase().trim();

    // Prüfe ob Code bereits existiert
    const existing = await db.discountCode.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Rabattcode existiert bereits" },
        { status: 409 }
      );
    }

    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    // Für STRIPE: Erstelle Coupon und Promotion Code
    if (validatedData.provider === DiscountProvider.STRIPE) {
      try {
        const stripeResult = await createStripeCouponAndPromo({
          code: normalizedCode,
          type: validatedData.type,
          percentOff: validatedData.percentOff,
          amountOffCents: validatedData.amountOffCents,
          currency: validatedData.currency,
        });
        stripeCouponId = stripeResult.couponId;
        stripePromotionCodeId = stripeResult.promotionCodeId;
      } catch (stripeError: any) {
        console.error("Stripe error:", stripeError);
        // Prüfe ob Code-Konflikt
        if (stripeError.code === "resource_already_exists") {
          return NextResponse.json(
            { error: "Rabattcode existiert bereits bei Stripe" },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Fehler beim Erstellen des Stripe Promotion Codes", details: stripeError.message },
          { status: 500 }
        );
      }
    }

    // Erstelle Discount Code in DB
    const discount = await db.discountCode.create({
      data: {
        provider: validatedData.provider,
        code: normalizedCode,
        type: validatedData.type,
        percentOff: validatedData.percentOff || null,
        amountOffCents: validatedData.amountOffCents || null,
        currency: validatedData.currency,
        isActive: validatedData.isActive,
        startsAt: validatedData.startsAt ? new Date(validatedData.startsAt) : null,
        endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : null,
        maxRedemptions: validatedData.maxRedemptions || null,
        restrictToVideoCourseId: validatedData.restrictToVideoCourseId || null,
        stripeCouponId,
        stripePromotionCodeId,
      },
      include: {
        videoCourse: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "DiscountCode",
        id: discount.id,
        label: discount.code,
      },
      action: AuditAction.CREATE,
      message: `Rabattcode '${discount.code}' erstellt (${discount.type === "PERCENT" ? `${discount.percentOff}%` : `${discount.amountOffCents! / 100}€`})`,
      meta: {
        provider: discount.provider,
        type: discount.type,
        percentOff: discount.percentOff,
        amountOffCents: discount.amountOffCents,
      },
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating discount:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}



