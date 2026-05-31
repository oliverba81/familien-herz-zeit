import { z } from "zod";
import { DiscountProvider, DiscountType } from "@prisma/client";

export const discountCodeSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, "Code darf nur Großbuchstaben, Zahlen, Bindestriche und Unterstriche enthalten"),
  provider: z.nativeEnum(DiscountProvider),
  type: z.nativeEnum(DiscountType),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOffCents: z.number().int().min(0).optional(),
  currency: z.string().default("eur"),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  restrictToVideoCourseId: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.type === DiscountType.PERCENT) {
      return data.percentOff !== undefined && data.percentOff > 0;
    } else {
      return data.amountOffCents !== undefined && data.amountOffCents > 0;
    }
  },
  {
    message: "percentOff oder amountOffCents muss gesetzt sein",
  }
);

export type DiscountCodeFormData = z.infer<typeof discountCodeSchema>;



