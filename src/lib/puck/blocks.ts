import type { CSSProperties } from "react";

/** Geteilte Konstanten/Helfer für Layout-/Content-Blöcke (Config + renderPuckTree). */

export const SPACER_SIZES: Record<string, string> = {
  sm: "1rem",
  md: "2rem",
  lg: "4rem",
  xl: "6rem",
};

export const SECTION_PADDING: Record<string, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "4rem",
};

export const SECTION_MAXWIDTH: Record<string, string> = {
  none: "",
  narrow: "max-w-2xl mx-auto",
  wide: "max-w-5xl mx-auto",
};

export interface SectionStyleProps {
  background?: string;
  backgroundImage?: string;
  padding?: string;
}

/** Inline-Style für den Sektion-Block (Hintergrundfarbe/-bild, Innenabstand). */
export function sectionStyle(props: SectionStyleProps): CSSProperties {
  const style: CSSProperties = {
    padding: SECTION_PADDING[props.padding ?? "md"] ?? SECTION_PADDING.md,
  };
  if (props.background) style.backgroundColor = props.background;
  if (props.backgroundImage) {
    style.backgroundImage = `url(${props.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
}

/* --- Bild-Block: Größe, Ausrichtung, Rundung, Rahmen --- */

export const IMAGE_WIDTH: Record<string, string> = {
  sm: "16rem",
  md: "32rem",
  lg: "48rem",
  full: "100%",
};

export const IMAGE_ROUNDED: Record<string, string> = {
  none: "0",
  sm: "0.375rem",
  lg: "1rem",
  full: "9999px",
};

export interface ImageStyleProps {
  width?: string;
  align?: string;
  rounded?: string;
  bordered?: boolean;
}

/** Inline-Style für das <img> (Breite, Ausrichtung via auto-Margin, Rundung, Rahmen). */
export function imageStyle(props: ImageStyleProps): CSSProperties {
  const maxWidth = IMAGE_WIDTH[props.width ?? "full"] ?? IMAGE_WIDTH.full;
  const style: CSSProperties = {
    maxWidth,
    width: maxWidth === "100%" ? "100%" : undefined,
    height: "auto",
    display: "block",
    borderRadius: IMAGE_ROUNDED[props.rounded ?? "none"] ?? "0",
  };
  // Ausrichtung über auto-Margins (greift nur, wenn die Breite < 100% ist).
  if (props.align === "center") {
    style.marginLeft = "auto";
    style.marginRight = "auto";
  } else if (props.align === "right") {
    style.marginLeft = "auto";
  }
  if (props.bordered) style.border = "1px solid #e5e7eb";
  return style;
}

/* --- Button-Block: Variante, Größe --- */

export const BUTTON_SIZE: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5",
  lg: "px-7 py-3.5 text-lg",
};

/** Tailwind-Klassen für den Button (Variante + Größe). */
export function buttonClasses(variant?: string, size?: string): string {
  const sizeCls = BUTTON_SIZE[size ?? "md"] ?? BUTTON_SIZE.md;
  const variantCls =
    variant === "secondary"
      ? "border border-rose-500 text-rose-600"
      : "bg-rose-500 text-white";
  return `inline-flex items-center gap-2 rounded-lg font-semibold ${sizeCls} ${variantCls}`;
}

/* --- Spalten-Block: Verhältnis & Abstand --- */

export const COLUMNS_GAP: Record<string, string> = {
  sm: "0.75rem",
  md: "1.5rem",
  lg: "3rem",
};

/**
 * grid-template-columns für den Spalten-Block. `ratio` ist eine Bindestrich-Liste
 * von Anteilen (z. B. "2-1" → "2fr 1fr"); ohne/ungültig → gleich breite Spalten.
 */
export function columnsTemplate(count: number, ratio?: string): string {
  const cols = Number(count) >= 3 ? 3 : 2;
  if (ratio && /^\d+(-\d+)+$/.test(ratio)) {
    const parts = ratio.split("-").slice(0, cols);
    if (parts.length === cols) return parts.map((n) => `${n}fr`).join(" ");
  }
  return `repeat(${cols}, minmax(0, 1fr))`;
}

/* --- Embed-Block: YouTube / Vimeo / generisches iframe --- */

/** Wandelt eine eingegebene URL in eine einbettbare iframe-URL um. */
export function toEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url; // generisches iframe
}

/* --- Responsive pro Breakpoint (Spalten & Galerie) --- */

/** Optionen für per-Breakpoint-Spaltenzahl (Editor-Select). "auto" = vom Desktop erben. */
export const RESPONSIVE_COL_OPTIONS = [
  { label: "Automatisch", value: "auto" },
  { label: "1 Spalte", value: "1" },
  { label: "2 Spalten", value: "2" },
  { label: "3 Spalten", value: "3" },
  { label: "4 Spalten", value: "4" },
] as const;

/** "auto"/leer → null (erben); sonst grid-template-columns-Wert (z. B. "repeat(2, minmax(0,1fr))"). */
export function colsTemplateValue(v?: string): string | null {
  if (!v || v === "auto") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 6) return null;
  return n === 1 ? "1fr" : `repeat(${n}, minmax(0, 1fr))`;
}

/** "auto"/leer → null (erben); sonst die Spaltenzahl als String (für number-basierte var()). */
export function colsNumberValue(v?: string): string | null {
  if (!v || v === "auto") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 6) return null;
  return String(n);
}
