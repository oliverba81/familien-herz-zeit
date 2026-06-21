import { revalidateTag as nextRevalidateTag } from "next/cache";

/**
 * Wrapper um Next.js' `revalidateTag`.
 *
 * In Next.js 16 wurde die Signatur auf `revalidateTag(tag, profile)` geändert
 * (zweites Argument verpflichtend). Die On-Demand-Revalidierung per Tag
 * funktioniert zur Laufzeit weiterhin mit nur einem Argument — genau so, wie
 * der Code es bisher (mit verstreuten `@ts-ignore`) getan hat.
 *
 * Dieser Wrapper bündelt die Typ-Inkompatibilität an genau einer Stelle:
 * verhaltensgleich (ein Argument), aber typsicher aufrufbar und an einem Ort
 * anpassbar, falls sich das Laufzeitverhalten von Next.js ändert.
 */
export function revalidateTag(tag: string): void {
  (nextRevalidateTag as (tag: string) => void)(tag);
}
