import { db } from "@/lib/db";
import type { ReusableLoader } from "./reusable";

/**
 * DB-Loader für Reusable-Blöcke (Server). Lädt den gespeicherten Inhalt
 * (V1/V2/Puck) per ReusableBlock.id. Wird in `resolveReusableTree` injiziert.
 *
 * Cache/Invalidierung via revalidateTag('reusable:<id>') kann später ergänzt werden.
 */
export const loadReusableContent: ReusableLoader = async (reusableId: string) => {
  const block = await db.reusableBlock.findUnique({
    where: { id: reusableId },
    select: { contentJson: true },
  });
  return block?.contentJson ?? null;
};
