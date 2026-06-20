/**
 * Konvertiert Page-Content V1 (Block-Builder) in V2-HTML mit Inline-Styles.
 * Für Übernahme eines kompletten V1-Designs in den WYSIWYG-Pagebuilder (V2).
 */

import type { PageContentV1 } from "./schema";
import type { Block } from "./types";
import type {
  HeroBlockData,
  TextBlockData,
  RichTextBlockData,
  ImageBlockData,
  VideoBlockData,
  FeaturesBlockData,
  TestimonialsBlockData,
  CTABlockData,
  SpacerBlockData,
  TableBlockData,
  TableCell,
  TableRow,
  SectionBlockData,
  ReusableBlockData,
} from "./types";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import {
  V2_EMBED_BLOCK_TYPES,
  getV2EmbedPlaceholderHtml,
  type V2EmbedBlockType,
} from "./v2-embed-defaults";

const BLOCK_SPACING = "2rem"; // space-y-8

// --- Hilfsfunktionen ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleObjToStr(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => {
      const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
      return `${cssKey}: ${v}`;
    })
    .join("; ");
}

/** Border-Styles für Bild/TableCell (analog page-renderer getBorderInlineStyles). */
function getBorderInlineStyles(
  borderStyle: string,
  borderWidth?: string
): Record<string, string> {
  const defaultBorderWidths: Record<string, string> = {
    glass: "1px",
    glow: "2px",
    gradient: "2px",
    soft: "1px",
    minimal: "1px",
    floating: "1px",
  };
  const finalBorderWidth = borderWidth || defaultBorderWidths[borderStyle] || "1px";

  switch (borderStyle) {
    case "glass":
      return {
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `${finalBorderWidth} solid rgba(255, 255, 255, 0.3)`,
        borderRadius: "1rem",
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      };
    case "glow":
      return {
        backgroundColor: "white",
        border: `${finalBorderWidth} solid rgb(251, 113, 133)`,
        borderRadius: "0.75rem",
        boxShadow:
          "0 10px 25px -5px rgba(244, 63, 94, 0.2), 0 0 0 1px rgba(244, 63, 94, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      };
    case "gradient":
      return {
        border: `${finalBorderWidth} solid transparent`,
        background:
          "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%) border-box",
        backgroundClip: "padding-box, border-box",
        WebkitBackgroundClip: "padding-box, border-box",
        borderRadius: "0.75rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      };
    case "soft":
      return {
        backgroundColor: "rgb(249, 250, 251)",
        border: `${finalBorderWidth} solid rgba(229, 231, 235, 0.5)`,
        borderRadius: "1rem",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.1)",
      };
    case "minimal":
      return {
        backgroundColor: "white",
        border: `${finalBorderWidth} solid rgba(209, 213, 219, 0.6)`,
        borderRadius: "0.5rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      };
    case "floating":
      return {
        backgroundColor: "white",
        border: `${finalBorderWidth} solid rgb(243, 244, 246)`,
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      };
    default:
      return {};
  }
}

function getRoundedStyle(rounded?: string | boolean): string {
  if (typeof rounded === "boolean") return rounded ? "0.75rem" : "0";
  switch (rounded) {
    case "sm":
      return "0.125rem";
    case "md":
      return "0.375rem";
    case "lg":
      return "0.5rem";
    case "full":
      return "9999px";
    default:
      return "0";
  }
}

// --- Block-Konverter (rekursiv nutzbar) ---

type ConvertBlockFn = (block: Block, options: { isLast?: boolean }) => string;

function convertHero(data: HeroBlockData): string {
  const alignMap = { left: "left", center: "center", right: "right" } as const;
  const textAlign = alignMap[data.align || "center"];
  const style = styleObjToStr({
    background: "linear-gradient(to bottom right, #fffbeb, #fff7ed, #fff1f2)",
    borderRadius: "1rem",
    padding: "3rem",
    textAlign,
  });
  const heading = escapeHtml(data.heading || "Überschrift");
  const subheading = data.subheading ? `<p style="font-size:1.25rem;color:rgb(55,65,81);margin:0;">${escapeHtml(data.subheading)}</p>` : "";
  return `<div style="${style}"><h2 style="font-size:2.25rem;font-weight:700;color:rgb(17,24,39);margin:0 0 1rem 0;">${heading}</h2>${subheading}</div>`;
}

function convertText(data: TextBlockData): string {
  const text = data.text || "";
  const hasHtml = /<[^>]+>/.test(text);
  const baseStyle = "max-width:100%;color:rgb(55,65,81);line-height:1.625;white-space:pre-line;";
  if (hasHtml) {
    const cleaned = cleanAndConvertHtml(text);
    return `<div style="${baseStyle}" class="prose max-w-none">${cleaned}</div>`;
  }
  return `<div style="${baseStyle}"><div style="${baseStyle}">${escapeHtml(text)}</div></div>`;
}

function convertRichText(data: RichTextBlockData): string {
  const html = data.html || "";
  if (!html || html.trim() === "" || html === "<p></p>") return "";
  const cleaned = cleanAndConvertHtml(html);
  const fontSize = data.customFontSize || (data.fontSize === "custom" ? "1rem" : undefined);
  const wrapperStyle = styleObjToStr({
    maxWidth: "100%",
    ...(fontSize ? { fontSize } : {}),
  });
  return `<div style="${wrapperStyle}" class="tinymce-preview-content max-w-none">${cleaned}</div>`;
}

function convertImage(data: ImageBlockData): string {
  const media = data.media || (data.src ? { url: data.src, alt: data.alt || "", caption: data.caption || "" } : null);
  const imageUrl = media?.url || data.src;
  const imageAlt = media?.alt || data.alt || "Bild";
  const imageCaption = media?.caption || data.caption;
  const aspect = data.aspect || "auto";
  const size = data.size ?? 100;
  const fullWidth = data.fullWidth || false;
  const fixedHeight = data.fixedHeight;
  const hasBorder = data.borderStyle && data.borderStyle !== "none";
  const rounded = getRoundedStyle(data.rounded);

  if (!imageUrl) {
    return `<figure style="padding:2rem;background:rgb(243,244,246);border-radius:0.5rem;text-align:center;color:rgb(107,114,128);border:1px solid rgb(229,231,235);"><p style="font-size:0.875rem;">Kein Medium gewählt</p></figure>`;
  }

  const containerStyle: Record<string, string> = {
    display: "block",
    position: "relative",
    ...(size !== 100 && !fullWidth ? { width: `${size}%`, margin: "0 auto" } : fullWidth ? { width: "100%" } : {}),
    ...(fixedHeight ? { height: fixedHeight } : {}),
  };
  if (hasBorder) {
    const borderStyle = data.borderStyle || "none";
    const borderWidth = data.borderWidth;
    Object.assign(containerStyle, getBorderInlineStyles(borderStyle, borderWidth));
    containerStyle.padding = data.borderPadding || "16px";
    containerStyle.boxSizing = "border-box";
  } else if (rounded !== "0") {
    containerStyle.borderRadius = rounded;
    containerStyle.overflow = "hidden";
  }

  const imgStyle: Record<string, string> = {
    maxWidth: "100%",
    height: "auto",
    display: "block",
    ...(rounded !== "0" ? { borderRadius: rounded } : {}),
  };
  const imgTag = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" style="${styleObjToStr(imgStyle)}" loading="lazy" />`;
  const captionHtml = imageCaption
    ? `<figcaption style="font-size:0.875rem;color:rgb(75,85,99);margin-top:0.5rem;text-align:center;">${escapeHtml(imageCaption)}</figcaption>`
    : "";
  return `<figure style="${styleObjToStr(containerStyle)}">${imgTag}${captionHtml}</figure>`;
}

function convertVideo(data: VideoBlockData): string {
  const media = data.media || (data.src ? { url: data.src } : null);
  const videoUrl = media?.url || data.src;
  if (!videoUrl) {
    return `<div style="padding:2rem;background:rgb(243,244,246);border-radius:0.5rem;text-align:center;color:rgb(107,114,128);border:1px solid rgb(229,231,235);"><p style="font-size:0.875rem;">Kein Medium gewählt</p></div>`;
  }
  const titleHtml = data.title
    ? `<h3 style="font-size:1.125rem;font-weight:600;color:rgb(17,24,39);margin-bottom:0.75rem;">${escapeHtml(data.title)}</h3>`
    : "";
  const wrapperStyle = styleObjToStr({
    marginBottom: "0.75rem",
  });
  const videoWrapperStyle = styleObjToStr({
    backgroundColor: "white",
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
    overflow: "hidden",
    border: "1px solid rgb(229,231,235)",
  });
  return `<div style="${wrapperStyle}">${titleHtml}<div style="${videoWrapperStyle}"><video src="${escapeHtml(videoUrl)}" controls style="width:100%;height:auto;">Dein Browser unterstützt das Video-Element nicht.</video></div></div>`;
}

function convertFeatures(data: FeaturesBlockData): string {
  const items = data.items || [];
  if (items.length === 0) return "";
  const gridStyle = styleObjToStr({
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: "1.5rem",
  });
  const itemStyle = styleObjToStr({
    padding: "1.5rem",
    backgroundColor: "white",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    border: "1px solid rgb(229,231,235)",
  });
  const itemsHtml = items
    .map(
      (item) =>
        `<div style="${itemStyle}"><h3 style="font-size:1.25rem;font-weight:600;color:rgb(17,24,39);margin:0 0 0.5rem 0;">${escapeHtml(item.title)}</h3><p style="color:rgb(75,85,99);margin:0;">${escapeHtml(item.text)}</p></div>`
    )
    .join("");
  return `<div style="${gridStyle}">${itemsHtml}</div>`;
}

function convertTestimonials(data: TestimonialsBlockData): string {
  const items = data.items || [];
  if (items.length === 0) return "";
  const wrapperStyle = styleObjToStr({ marginBottom: "1.5rem" });
  const cardStyle = styleObjToStr({
    padding: "1.5rem",
    backgroundColor: "rgb(255,241,242)",
    borderRadius: "0.5rem",
    borderLeft: "4px solid rgb(244,63,94)",
  });
  const itemsHtml = items
    .map(
      (item) =>
        `<div style="${wrapperStyle}"><div style="${cardStyle}"><p style="color:rgb(55,65,81);margin:0 0 1rem 0;font-style:italic;">"${escapeHtml(item.text)}"</p><p style="font-size:0.875rem;font-weight:600;color:rgb(17,24,39);margin:0;">— ${escapeHtml(item.name)}</p></div></div>`
    )
    .join("");
  return `<div style="${wrapperStyle}">${itemsHtml}</div>`;
}

function convertCTA(data: CTABlockData): string {
  const style = styleObjToStr({
    background: "linear-gradient(to right, rgb(244,63,94), rgb(249,115,22))",
    borderRadius: "1rem",
    padding: "3rem",
    textAlign: "center",
    color: "white",
  });
  const heading = escapeHtml(data.heading || "Call to Action");
  const textHtml = data.text
    ? `<p style="font-size:1.25rem;margin-bottom:1.5rem;opacity:0.9;">${escapeHtml(data.text)}</p>`
    : "";
  const buttonHref = data.buttonHref || "#";
  const buttonLabel = escapeHtml(data.buttonLabel || "Jetzt starten");
  const buttonStyle = styleObjToStr({
    display: "inline-block",
    backgroundColor: "white",
    color: "rgb(244,63,94)",
    fontWeight: "600",
    padding: "0.75rem 2rem",
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  });
  return `<div style="${style}"><h2 style="font-size:1.875rem;font-weight:700;margin:0 0 1rem 0;">${heading}</h2>${textHtml}<a href="${escapeHtml(buttonHref)}" style="${buttonStyle}">${buttonLabel}</a></div>`;
}

function convertSpacer(data: SpacerBlockData): string {
  const sizeMap: Record<string, string> = {
    sm: "1rem",
    md: "2rem",
    lg: "4rem",
    xl: "6rem",
  };
  const height = sizeMap[data.size || "md"] || sizeMap.md;
  return `<div style="height:${height};"></div>`;
}

function convertTableCell(
  cell: TableCell,
  convertBlock: ConvertBlockFn
): string {
  const blocks = cell.blocks || [];
  const style: Record<string, string> = {
    padding: "16px",
    verticalAlign: "top",
  };
  if (cell.backgroundColor && cell.backgroundColor.startsWith("#")) {
    style.backgroundColor = cell.backgroundColor;
  }
  const borderStyle = cell.borderStyle || "none";
  if (borderStyle !== "none" && borderStyle !== "custom") {
    Object.assign(style, getBorderInlineStyles(borderStyle));
  }
  const innerHtml =
    blocks.length > 0
      ? blocks.map((b) => convertBlock(b, { isLast: false })).join("")
      : '<div style="font-size:0.875rem;color:rgb(156,163,175);font-style:italic;">Leere Zelle</div>';
  return `<td style="${styleObjToStr(style)}"><div style="position:relative;overflow:visible;">${innerHtml}</div></td>`;
}

function convertTable(
  data: TableBlockData,
  convertBlock: ConvertBlockFn
): string {
  const rows = data.rows || [];
  if (rows.length === 0) {
    return `<div style="padding:1rem;background:rgb(249,250,251);border-radius:0.5rem;text-align:center;color:rgb(107,114,128);border:1px solid rgb(229,231,235);"><p style="font-size:0.875rem;">Tabelle ist leer</p></div>`;
  }
  const columnWidths = data.columnWidths || [];
  const rowSpacing = data.customRowSpacing || "8px";
  const columnSpacing = data.customColumnSpacing || "8px";
  const tableStyle = styleObjToStr({
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: `${columnSpacing} ${rowSpacing}`,
    tableLayout: columnWidths.length > 0 ? "fixed" : "auto",
  });
  const maxCols = Math.max(...rows.map((r) => (r.cells || []).length));
  const colgroup =
    columnWidths.length > 0
      ? `<colgroup>${Array.from({ length: maxCols }, (_, i) =>
          columnWidths[i] ? `<col style="width:${columnWidths[i]};" />` : "<col />"
        ).join("")}</colgroup>`
      : "";
  const tbody = rows
    .map((row: TableRow) => {
      const cells = row.cells || [];
      const cellsHtml = cells.map((cell) => convertTableCell(cell, convertBlock)).join("");
      return `<tr>${cellsHtml}</tr>`;
    })
    .join("");
  return `<div style="overflow-x:auto;"><table style="${tableStyle}">${colgroup}<tbody>${tbody}</tbody></table></div>`;
}

function convertSection(
  data: SectionBlockData,
  convertBlock: ConvertBlockFn
): string {
  const children = data.children || [];
  const backgroundStyle = data.background === "soft" ? "background-color:rgb(249,250,251);" : "";
  const paddingMap: Record<string, string> = {
    sm: "1rem 0",
    md: "2rem 0",
    lg: "3rem 0",
  };
  const padding = paddingMap[data.padding || "md"] || "2rem 0";
  const layoutStyle = data.layout === "narrow" ? "max-width:56rem;margin-left:auto;margin-right:auto;" : "";
  const sectionStyle = styleObjToStr({ ...(backgroundStyle ? { backgroundColor: "rgb(249,250,251)" } : {}), padding });
  const innerStyle = layoutStyle ? ` style="${layoutStyle}"` : "";
  const childrenHtml =
    children.length > 0
      ? children.map((b) => convertBlock(b, { isLast: false })).join("")
      : "";
  const titleHtml = data.title
    ? `<h2 style="font-size:1.5rem;font-weight:700;color:rgb(17,24,39);margin:0 0 1rem 0;">${escapeHtml(data.title)}</h2>`
    : "";
  return `<section style="${sectionStyle}"><div${innerStyle}>${titleHtml}<div style="margin-bottom:${BLOCK_SPACING};">${childrenHtml}</div></div></section>`;
}

function convertReusable(data: ReusableBlockData): string {
  // Ohne DB-Zugriff nur Platzhalter
  const style = styleObjToStr({
    padding: "2rem",
    backgroundColor: "rgb(239,246,255)",
    border: "2px solid rgb(191,219,254)",
    borderRadius: "0.5rem",
    textAlign: "center",
  });
  const idText = data.reusableId ? escapeHtml(data.reusableId) : "—";
  return `<div style="${style}"><p style="font-size:0.875rem;font-weight:500;color:rgb(30,64,175);">🔄 Reusable Block</p><p style="font-size:0.75rem;color:rgb(37,99,235);margin-top:0.25rem;">ID: ${idText}</p></div>`;
}

function convertEmbedBlock(blockType: V2EmbedBlockType): string {
  return getV2EmbedPlaceholderHtml(blockType);
}

// --- Hauptkonverter ---

function convertBlock(
  block: Block,
  options: { isLast?: boolean; convertBlockRef: ConvertBlockFn }
): string {
  const { isLast = false, convertBlockRef } = options;
  const marginBottom = isLast ? "0" : BLOCK_SPACING;
  const wrapperStyle = styleObjToStr({ marginBottom });

  let inner = "";
  try {
    switch (block.type) {
      case "hero":
        inner = convertHero(block.data as HeroBlockData);
        break;
      case "text":
        inner = convertText(block.data as TextBlockData);
        break;
      case "richText":
        inner = convertRichText(block.data as RichTextBlockData);
        break;
      case "image":
        inner = convertImage(block.data as ImageBlockData);
        break;
      case "video":
        inner = convertVideo(block.data as VideoBlockData);
        break;
      case "features":
        inner = convertFeatures(block.data as FeaturesBlockData);
        break;
      case "testimonials":
        inner = convertTestimonials(block.data as TestimonialsBlockData);
        break;
      case "cta":
        inner = convertCTA(block.data as CTABlockData);
        break;
      case "spacer":
        inner = convertSpacer(block.data as SpacerBlockData);
        break;
      case "table":
        inner = convertTable(block.data as TableBlockData, convertBlockRef);
        break;
      case "section":
        inner = convertSection(block.data as SectionBlockData, convertBlockRef);
        break;
      case "reusable":
        inner = convertReusable(block.data as ReusableBlockData);
        break;
      case "courses":
      case "current-appointments":
      case "herzzeit-story":
      case "contactForm":
        if (V2_EMBED_BLOCK_TYPES.includes(block.type as V2EmbedBlockType)) {
          inner = convertEmbedBlock(block.type as V2EmbedBlockType);
        } else {
          inner = `<div style="padding:1rem;background:rgb(254,249,195);border:1px solid rgb(253,224,71);border-radius:0.5rem;color:rgb(113,63,18);font-size:0.875rem;">Unbekannter Block: ${escapeHtml(block.type)}</div>`;
        }
        break;
      default:
        inner = `<div style="padding:1rem;background:rgb(254,249,195);border:1px solid rgb(253,224,71);border-radius:0.5rem;color:rgb(113,63,18);font-size:0.875rem;">Unbekannter Block-Typ: ${escapeHtml(block.type)} | ID: ${escapeHtml(block.id)}</div>`;
    }
  } catch (err) {
    inner = `<div style="padding:1rem;background:rgb(254,226,226);border:1px solid rgb(252,165,165);border-radius:0.5rem;color:rgb(127,29,29);font-size:0.875rem;">Block konnte nicht konvertiert werden (Typ: ${escapeHtml(block.type)})</div>`;
  }

  if (!inner) return "";
  return `<div style="${wrapperStyle}">${inner}</div>`;
}

/**
 * Konvertiert Page-Content V1 in einen HTML-String für V2 (WYSIWYG).
 * Alle sichtbaren Styles werden als Inline-Styles ausgegeben.
 */
export function convertV1ToV2Html(content: PageContentV1): string {
  const blocks = content.blocks || [];
  if (blocks.length === 0) return "";

  const convertBlockRef: ConvertBlockFn = (block, opts) =>
    convertBlock(block, { ...opts, convertBlockRef });

  const segments = blocks.map((block, index) =>
    convertBlockRef(block, { isLast: index === blocks.length - 1 })
  );
  return segments.filter(Boolean).join("");
}
