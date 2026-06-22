import type { CSSProperties, ReactNode } from "react";
import {
  imageStyle,
  buttonClasses,
  columnsTemplate,
  COLUMNS_GAP,
  toEmbedUrl,
  colsTemplateValue,
  colsNumberValue,
} from "@/lib/puck/blocks";

/**
 * Geteilte, präsentationale Block-Views (kein DB/Client-State) für Puck.
 * Genutzt im Editor (config render) UND live (renderPuckTree) → identische Ausgabe.
 */

export interface ImageViewProps {
  src?: string;
  alt?: string;
  caption?: string;
  width?: string;
  align?: string;
  rounded?: string;
  bordered?: boolean;
  href?: string;
  newTab?: boolean;
}

export function ImageView(props: ImageViewProps): ReactNode {
  const { src, alt, caption, href, newTab } = props;
  if (!src) {
    return (
      <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">Kein Bild gewählt</div>
    );
  }
   
  const img = <img src={src} alt={alt || ""} style={imageStyle(props)} />;
  const linked = href ? (
    <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined}>
      {img}
    </a>
  ) : (
    img
  );
  return (
    <figure>
      {linked}
      {caption ? <figcaption className="text-sm text-gray-500 mt-1">{caption}</figcaption> : null}
    </figure>
  );
}

export interface ButtonViewProps {
  text?: string;
  href?: string;
  variant?: string;
  align?: string;
  size?: string;
  icon?: string;
  newTab?: boolean;
}

export function ButtonView(props: ButtonViewProps): ReactNode {
  const { text, href, variant, align, size, icon, newTab } = props;
  return (
    <div style={{ textAlign: (align as CSSProperties["textAlign"]) || "left" }}>
      <a
        href={href || "#"}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={buttonClasses(variant, size)}
      >
        {icon ? <span aria-hidden>{icon}</span> : null}
        {text || "Button"}
      </a>
    </div>
  );
}

export interface EmbedViewProps {
  url?: string;
  title?: string;
}

export function EmbedView({ url, title }: EmbedViewProps): ReactNode {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) {
    return (
      <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">Keine Embed-URL</div>
    );
  }
  return (
    <figure>
      <div style={{ position: "relative", paddingTop: "56.25%" }}>
        <iframe
          src={embedUrl}
          title={title || "Eingebetteter Inhalt"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
      {title ? <figcaption className="text-sm text-gray-500 mt-1">{title}</figcaption> : null}
    </figure>
  );
}

export interface AccordionItem {
  question?: string;
  answer?: string;
}

export function AccordionView({ items }: { items?: AccordionItem[] }): ReactNode {
  const list = items ?? [];
  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {list.map((item, i) => (
        <details key={i} className="group py-3">
          <summary className="cursor-pointer font-semibold text-gray-900 list-none flex justify-between items-center">
            {item.question || "Frage"}
            <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <p className="mt-2 text-gray-600 whitespace-pre-line">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export interface GalleryImage {
  src?: string;
  alt?: string;
}

export function GalleryView({
  items,
  columns,
  layout,
  tabletColumns,
  mobileColumns,
}: {
  items?: GalleryImage[];
  columns?: number;
  /** "grid" (Raster, responsiv gestapelt) oder "slider" (horizontale Scroll-Snap-Reihe). */
  layout?: string;
  /** Per-Breakpoint-Spaltenzahl ("auto"/"1".."4"); "auto" erbt den Default. */
  tabletColumns?: string;
  mobileColumns?: string;
}): ReactNode {
  const list = (items ?? []).filter((it) => it.src);
  const cols = [2, 3, 4].includes(Number(columns)) ? Number(columns) : 3;
  if (list.length === 0) {
    return (
      <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">Keine Bilder</div>
    );
  }
  // Responsives Verhalten (Raster stapelt je Breakpoint, Slider scrollt) liegt in
  // public/page-builder-v2-presets.css; die Spaltenzahlen kommen als Custom-Properties.
  const className = layout === "slider" ? "fhz-gallery fhz-gallery--slider" : "fhz-gallery";
  return (
    <div className={className} style={galleryContainerStyle(cols, tabletColumns, mobileColumns)}>
      {list.map((item, i) => (
         
        <img key={i} src={item.src} alt={item.alt || ""} className="fhz-gallery__img" />
      ))}
    </div>
  );
}

/**
 * Inline-Style für den Spalten-Container (Verhältnis + Abstand + per-Breakpoint-Spalten).
 * Tablet/Mobil werden nur gesetzt, wenn ausgewählt; sonst greifen die CSS-Defaults
 * (Tablet erbt Desktop-Template, Mobil stapelt auf 1) aus den Presets.
 */
export function columnsContainerStyle(
  count: number,
  ratio?: string,
  gap?: string,
  tabletCols?: string,
  mobileCols?: string
): CSSProperties {
  const style: Record<string, string> = {
    "--cols-template": columnsTemplate(count, ratio),
    "--cols-gap": COLUMNS_GAP[gap ?? "md"] ?? COLUMNS_GAP.md,
  };
  const t = colsTemplateValue(tabletCols);
  if (t) style["--cols-tablet"] = t;
  const m = colsTemplateValue(mobileCols);
  if (m) style["--cols-mobile"] = m;
  return style as CSSProperties;
}

/**
 * Inline-Style für den Galerie-Container (Spaltenzahl je Breakpoint als number-var).
 * Tablet/Mobil nur gesetzt, wenn ausgewählt; sonst CSS-Defaults (Tablet 2, Mobil 1).
 */
export function galleryContainerStyle(
  cols: number,
  tabletCols?: string,
  mobileCols?: string
): CSSProperties {
  const style: Record<string, string> = { "--gallery-cols": String(cols) };
  const t = colsNumberValue(tabletCols);
  if (t) style["--gallery-cols-tablet"] = t;
  const m = colsNumberValue(mobileCols);
  if (m) style["--gallery-cols-mobile"] = m;
  return style as CSSProperties;
}

export interface FeatureItem {
  title?: string;
  text?: string;
}

export function FeaturesView({
  title,
  items,
}: {
  title?: string;
  items?: FeatureItem[];
}): ReactNode {
  const list = items ?? [];
  return (
    <div>
      {title ? <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((item, i) => (
          <div key={i} className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface TestimonialItem {
  name?: string;
  text?: string;
}

export function TestimonialsView({
  title,
  items,
}: {
  title?: string;
  items?: TestimonialItem[];
}): ReactNode {
  const list = items ?? [];
  return (
    <div>
      {title ? <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2> : null}
      <div className="space-y-6">
        {list.map((item, i) => (
          <div key={i} className="p-6 bg-gray-50 rounded-lg border-l-4 border-rose-500">
            <p className="text-gray-700 mb-4">{item.text}</p>
            <p className="text-sm font-semibold text-gray-900">— {item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
