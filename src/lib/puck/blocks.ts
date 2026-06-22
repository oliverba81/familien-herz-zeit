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
