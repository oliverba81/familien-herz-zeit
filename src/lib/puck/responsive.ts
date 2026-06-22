/**
 * Responsive-Overrides (Feature 8): Sichtbarkeit pro Breakpoint über SSR-CSS-Klassen.
 *
 * Bewusst nur Sichtbarkeit (kein per-Breakpoint-Prop-Wert — Puck persistiert das nicht).
 * Klassen liegen in `public/page-builder-v2-presets.css` (im iframe + live geladen).
 */

export const RESPONSIVE_CLASS = {
  hideMobile: "fhz-hide-mobile",
  hideTablet: "fhz-hide-tablet",
  hideDesktop: "fhz-hide-desktop",
} as const;

/** Liefert die CSS-Klassen für die gesetzten Sichtbarkeits-Flags eines Blocks. */
export function getResponsiveClasses(props: Record<string, unknown>): string {
  const classes: string[] = [];
  if (props.hideMobile === true) classes.push(RESPONSIVE_CLASS.hideMobile);
  if (props.hideTablet === true) classes.push(RESPONSIVE_CLASS.hideTablet);
  if (props.hideDesktop === true) classes.push(RESPONSIVE_CLASS.hideDesktop);
  return classes.join(" ");
}

const yesNo = [
  { label: "Anzeigen", value: false },
  { label: "Ausblenden", value: true },
];

/** Wiederverwendbare Puck-Felder für die Sichtbarkeit (in jede Komponente gespreizt). */
export const responsiveFields = {
  hideMobile: { type: "radio" as const, label: "Mobil", options: yesNo },
  hideTablet: { type: "radio" as const, label: "Tablet", options: yesNo },
  hideDesktop: { type: "radio" as const, label: "Desktop", options: yesNo },
};

/** Default-Werte für die Sichtbarkeits-Felder. */
export const responsiveDefaults = {
  hideMobile: false,
  hideTablet: false,
  hideDesktop: false,
};
