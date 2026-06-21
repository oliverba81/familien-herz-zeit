import { db } from "@/lib/db";
import { DiscountCode } from "@prisma/client";
import { computeDiscountedPrice } from "./pricing";

interface ValidateDiscountParams {
  code: string;
  videoCourseId: string;
  priceCents: number;
  now?: Date;
}

type ValidateDiscountResult =
  | {
      ok: true;
      discount: DiscountCode;
      newPriceCents: number;
      discountCents: number;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "INACTIVE" | "EXPIRED" | "NOT_APPLICABLE" | "LIMIT_REACHED";
    };

/**
 * Validiert einen Rabattcode und berechnet den reduzierten Preis
 */
export async function validateDiscount({
  code,
  videoCourseId,
  priceCents,
  now = new Date(),
}: ValidateDiscountParams): Promise<ValidateDiscountResult> {
  // Case-insensitive Suche (uppercase)
  const normalizedCode = code.toUpperCase().trim();

  const discount = await db.discountCode.findUnique({
    where: { code: normalizedCode },
  });

  if (!discount) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Prüfe isActive
  if (!discount.isActive) {
    return { ok: false, reason: "INACTIVE" };
  }

  // Prüfe startsAt/endsAt
  if (discount.startsAt && now < discount.startsAt) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (discount.endsAt && now > discount.endsAt) {
    return { ok: false, reason: "EXPIRED" };
  }

  // Prüfe maxRedemptions
  if (discount.maxRedemptions && discount.timesRedeemed >= discount.maxRedemptions) {
    return { ok: false, reason: "LIMIT_REACHED" };
  }

  // Prüfe restrictToVideoCourseId
  if (discount.restrictToVideoCourseId && discount.restrictToVideoCourseId !== videoCourseId) {
    return { ok: false, reason: "NOT_APPLICABLE" };
  }

  // Berechne Discount (pure, getestet in pricing.test.ts)
  const { discountCents, newPriceCents } = computeDiscountedPrice(
    priceCents,
    discount.type,
    { percentOff: discount.percentOff, amountOffCents: discount.amountOffCents }
  );

  return {
    ok: true,
    discount,
    newPriceCents,
    discountCents,
  };
}

/**
 * Markiert einen Rabattcode als eingelöst (increment timesRedeemed)
 */
export async function markRedeemed(discountId: string): Promise<void> {
  await db.discountCode.update({
    where: { id: discountId },
    data: {
      timesRedeemed: {
        increment: 1,
      },
    },
  });
}

