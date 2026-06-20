import Stripe from "stripe";
import { DiscountType } from "@prisma/client";
import { getStripe } from "./client";

interface CreateStripeCouponAndPromoParams {
  code: string;
  type: DiscountType;
  percentOff?: number;
  amountOffCents?: number;
  currency?: string;
}

/**
 * Erstellt einen Stripe Coupon und Promotion Code
 */
export async function createStripeCouponAndPromo({
  code,
  type,
  percentOff,
  amountOffCents,
  currency = "eur",
}: CreateStripeCouponAndPromoParams): Promise<{
  couponId: string;
  promotionCodeId: string;
}> {
  const stripe = await getStripe();

  // Erstelle Coupon
  let coupon: Stripe.Coupon;

  if (type === DiscountType.PERCENT && percentOff) {
    coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: "once",
    });
  } else if (type === DiscountType.AMOUNT && amountOffCents) {
    coupon = await stripe.coupons.create({
      amount_off: amountOffCents,
      currency: currency.toLowerCase(),
      duration: "once",
    });
  } else {
    throw new Error("Invalid discount type or missing percentOff/amountOffCents");
  }

  // Erstelle Promotion Code
  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: code.toUpperCase(),
    active: true,
  } as any);

  return {
    couponId: coupon.id,
    promotionCodeId: promotionCode.id,
  };
}

/**
 * Deaktiviert einen Stripe Promotion Code
 */
export async function disableStripePromo(promotionCodeId: string): Promise<void> {
  const stripe = await getStripe();
  await stripe.promotionCodes.update(promotionCodeId, {
    active: false,
  });
}

