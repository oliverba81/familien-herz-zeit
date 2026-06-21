/**
 * Spiegelt die Stylesheets der Eltern-Seite in das (same-origin) Puck-Preview-iframe
 * und injiziert die per-Seite customCss — so rendert die Editor-Vorschau 1:1 wie live.
 *
 * Tailwind v4 ist build-time → wir klonen die bereits GEBAUTEN <link>/<style>-Tags aus
 * dem Eltern-<head> (kein CDN/JIT). Zusätzlich /page-builder-v2-presets.css (falls noch
 * nicht vorhanden) und die unscoped customCss (wie auf der Live-Seite, ohne @scope).
 *
 * Idempotent: entfernt zuvor injizierte Knoten vor dem erneuten Einfügen.
 */

const MARKER = "data-fhz-injected";
const PRESETS_HREF = "/page-builder-v2-presets.css";

export function syncIframeStyles(
  doc: Document,
  customCss?: string | null
): () => void {
  const head = doc.head;
  if (!head) return () => {};

  // Vorherige Injektionen entfernen (Idempotenz bei Re-Run).
  head.querySelectorAll(`[${MARKER}]`).forEach((n) => n.remove());

  // 1) Eltern-Stylesheets (Tailwind-Bundle + globals.css) klonen.
  const parentStyleNodes = document.head.querySelectorAll<HTMLElement>(
    'link[rel="stylesheet"], style'
  );
  parentStyleNodes.forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute(MARKER, "parent");
    head.appendChild(clone);
  });

  // 2) Style-Presets sicherstellen.
  const hasPresets = Array.from(
    head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  ).some((l) => l.getAttribute("href")?.includes(PRESETS_HREF));
  if (!hasPresets) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = PRESETS_HREF;
    link.setAttribute(MARKER, "presets");
    head.appendChild(link);
  }

  // 3) Per-Seite customCss unscoped injizieren (wie live).
  if (customCss && customCss.trim().length > 0) {
    const style = doc.createElement("style");
    style.setAttribute(MARKER, "customcss");
    style.textContent = customCss;
    head.appendChild(style);
  }

  return () => {
    head.querySelectorAll(`[${MARKER}]`).forEach((n) => n.remove());
  };
}
