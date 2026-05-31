import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { DiscountProvider } from "@prisma/client";
import { disableStripePromo } from "@/lib/stripe/discounts";
import { logAudit, getActorFromSession, getChangedFields } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/discounts/[id]
 * Aktiviert/Deaktiviert einen Rabattcode
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive muss ein Boolean sein" },
        { status: 400 }
      );
    }

    // Lade bestehenden Discount
    const existing = await db.discountCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Rabattcode nicht gefunden" },
        { status: 404 }
      );
    }

    // Wenn deaktiviert wird und provider=STRIPE: Deaktiviere auch bei Stripe
    if (!isActive && existing.provider === DiscountProvider.STRIPE && existing.stripePromotionCodeId) {
      try {
        await disableStripePromo(existing.stripePromotionCodeId);
      } catch (stripeError: any) {
        console.error("Fehler beim Deaktivieren des Stripe Promotion Codes:", stripeError);
        // Weiter mit DB-Update auch wenn Stripe-Fehler
      }
    }

    // Update in DB
    const updated = await db.discountCode.update({
      where: { id },
      data: { isActive },
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
        id: updated.id,
        label: updated.code,
      },
      action: AuditAction.STATUS_CHANGE,
      message: `Rabattcode '${updated.code}' ${isActive ? "aktiviert" : "deaktiviert"}`,
      meta: {
        oldIsActive: existing.isActive,
        newIsActive: updated.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error updating discount:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



