/**
 * Stylevorlagen für den Pagebuilder V2 (WYSIWYG).
 * Werden per Drag & Drop oder Klick auf Elemente im Editor angewendet.
 * CSS-Klassen müssen in public/page-builder-v2-presets.css definiert sein.
 */
export interface StylePreset {
  id: string;
  label: string;
  className: string;
  category: StylePresetCategory;
  icon?: string;
}

export type StylePresetCategory =
  | "rahmen"
  | "karten"
  | "abstaende"
  | "hintergrund"
  | "typografie"
  | "callout"
  | "bilder"
  | "tabellen";

export const STYLE_PRESETS: StylePreset[] = [
  // Rahmen
  { id: "frame-solid", label: "Rahmen durchgezogen", className: "fhz-frame-solid", category: "rahmen" },
  { id: "frame-double", label: "Rahmen doppelt", className: "fhz-frame-double", category: "rahmen" },
  { id: "frame-shadow", label: "Rahmen mit Schatten", className: "fhz-frame-shadow", category: "rahmen" },
  { id: "rounded-lg", label: "Abgerundet", className: "rounded-lg", category: "rahmen" },
  // Karten
  { id: "shadow-card", label: "Karte leicht", className: "fhz-shadow-card", category: "karten" },
  { id: "shadow-card-strong", label: "Karte stark", className: "fhz-shadow-card-strong", category: "karten" },
  // Abstände
  { id: "padding-sm", label: "Abstand klein", className: "fhz-padding-sm", category: "abstaende" },
  { id: "padding-md", label: "Abstand mittel", className: "fhz-padding-md", category: "abstaende" },
  { id: "padding-lg", label: "Abstand groß", className: "fhz-padding-lg", category: "abstaende" },
  // Hintergrund
  { id: "bg-highlight", label: "Hintergrund hell", className: "fhz-bg-highlight", category: "hintergrund" },
  { id: "bg-muted", label: "Hintergrund dezent", className: "fhz-bg-muted", category: "hintergrund" },
  // Callout
  { id: "callout-info", label: "Hinweis-Box", className: "fhz-callout-info", category: "callout" },
  { id: "callout-warn", label: "Warn-Box", className: "fhz-callout-warn", category: "callout" },
  // Bilder
  { id: "img-rounded", label: "Bild rund", className: "fhz-img-rounded", category: "bilder" },
  { id: "img-polaroid", label: "Bild Polaroid", className: "fhz-img-polaroid", category: "bilder" },
  // Tabellen
  { id: "table-zebra", label: "Tabelle Zebra", className: "fhz-table-zebra", category: "tabellen" },
  { id: "table-compact", label: "Tabelle kompakt", className: "fhz-table-compact", category: "tabellen" },
];

const CATEGORY_LABELS: Record<StylePresetCategory, string> = {
  rahmen: "Rahmen",
  karten: "Karten",
  abstaende: "Abstände",
  hintergrund: "Hintergrund",
  typografie: "Typografie",
  callout: "Hinweis-Boxen",
  bilder: "Bilder",
  tabellen: "Tabellen",
};

export function getStylePresetsByCategory(): Map<StylePresetCategory, StylePreset[]> {
  const map = new Map<StylePresetCategory, StylePreset[]>();
  for (const preset of STYLE_PRESETS) {
    const list = map.get(preset.category) ?? [];
    list.push(preset);
    map.set(preset.category, list);
  }
  return map;
}

export function getCategoryLabel(category: StylePresetCategory): string {
  return CATEGORY_LABELS[category];
}
