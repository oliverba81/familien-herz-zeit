/**
 * Einfacher In-Memory-Throttle. Funktioniert, weil die App als
 * langlebiger Node-Prozess (`next start`) läuft (nicht serverless).
 * Schlüssel z.B. `${ip}:${formId}`. IP wird NICHT persistiert.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Gibt false zurück, wenn das Limit im Zeitfenster überschritten wurde.
 * @param key      eindeutiger Schlüssel (transient, z.B. ip:formId)
 * @param limit    max. Anzahl Aktionen pro Fenster
 * @param windowMs Fensterlänge in Millisekunden
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    cleanup(now);
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Entfernt abgelaufene Buckets, damit die Map nicht unbegrenzt wächst. */
function cleanup(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
