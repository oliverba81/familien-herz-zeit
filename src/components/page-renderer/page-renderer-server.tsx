import {
  Block,
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
  SectionBlockData,
  ReusableBlockData,
  CoursesBlockData,
  CurrentAppointmentsBlockData,
  HerzZeitStoryBlockData,
  ContactFormBlockData,
} from "@/lib/page-builder/types";
import { PageContentV1 } from "@/lib/page-builder/schema";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import Image from "next/image";
import { ReusableBlockRenderer } from "./reusable-block-renderer";
import PageRenderer from "./page-renderer";
import CoursesBlock from "@/components/courses/courses-block";
import CurrentAppointmentsBlock from "@/components/courses/current-appointments-block";
import HerzZeitStoryBlock from "@/components/stories/herzzeit-story-block";
import ContactFormBlock from "./contact-form-block";

interface PageRendererServerProps {
  content: PageContentV1;
}

/**
 * Server Component Version von PageRenderer
 * Kann Reusable Blocks aus der DB laden
 */
export default function PageRendererServer({ content }: PageRendererServerProps) {
  if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {content.blocks.map((block: Block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

// JSX-Konstruktion ausgelagert: enthält die eigentlichen Block-Switch-Returns.
// Wird von BlockRenderer im try aufgerufen, damit der try keine JSX-Literale enthält.
function renderBlockContent(block: Block) {
  switch (block.type) {
    case "hero":
      return <HeroBlock data={block.data as HeroBlockData} />;
    case "text":
      return <TextBlock data={block.data as TextBlockData} />;
    case "richText":
      return <RichTextBlock data={block.data as RichTextBlockData} />;
    case "image":
      return <ImageBlock data={block.data as ImageBlockData} />;
    case "video":
      return <VideoBlock data={block.data as VideoBlockData} />;
    case "features":
      return <FeaturesBlock data={block.data as FeaturesBlockData} />;
    case "testimonials":
      return <TestimonialsBlock data={block.data as TestimonialsBlockData} />;
    case "cta":
      return <CTABlock data={block.data as CTABlockData} />;
    case "spacer":
      return <SpacerBlock data={block.data as SpacerBlockData} />;
    case "table":
      return <TableBlock data={block.data as TableBlockData} />;
    case "section":
      return <SectionBlock data={block.data as SectionBlockData} />;
    case "reusable":
      // Server Component: Kann Reusable Blocks aus DB laden
      return <ReusableBlockRenderer data={block.data as ReusableBlockData} />;
    case "courses":
      return <CoursesBlock data={block.data as CoursesBlockData} />;
    case "current-appointments":
      return <CurrentAppointmentsBlock data={block.data as CurrentAppointmentsBlockData} />;
    case "herzzeit-story":
      return <HerzZeitStoryBlock data={block.data as HerzZeitStoryBlockData} />;
    case "contactForm":
      return <ContactFormBlock data={block.data as ContactFormBlockData} />;
    default:
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Unbekannter Block-Typ: {block.type}
          </p>
          <p className="text-xs text-yellow-600 mt-1">ID: {block.id}</p>
        </div>
      );
  }
}

// Ausgelagerter Fehler-Fallback (Modulebene), damit der catch-Block keine JSX-Literale konstruiert.
function BlockRenderError({ block, error }: { block: Block; error: unknown }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm font-medium text-red-900">
        Block konnte nicht gerendert werden
      </p>
      <p className="text-xs text-red-700 mt-1">
        Typ: {block.type} | ID: {block.id}
      </p>
      {error instanceof Error && (
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      )}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  try {
    return renderBlockContent(block);
  } catch (error) {
    console.error("Error rendering block:", error, block);
    return <BlockRenderError block={block} error={error} />;
  }
}

// Reuse Block Components from page-renderer.tsx
function HeroBlock({ data }: { data: HeroBlockData }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[data.align || "center"];

  return (
    <div className={`py-12 ${alignClass}`}>
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        {data.heading}
      </h1>
      {data.subheading && (
        <p className="text-xl text-gray-600">{data.subheading}</p>
      )}
    </div>
  );
}

function TextBlock({ data }: { data: TextBlockData }) {
  return (
    <div className="prose max-w-none">
      <p className="text-gray-700 whitespace-pre-line">{data.text}</p>
    </div>
  );
}

function RichTextBlock({ data }: { data: RichTextBlockData }) {
  const cleanedHtml = cleanAndConvertHtml(data.html || "");
  const fontSizeClass = data.fontSize || "md";
  const customFontSize = data.customFontSize;

  const style = customFontSize ? { fontSize: customFontSize } : undefined;

  return (
    <div
      className={`tinymce-preview-content prose max-w-none text-${fontSizeClass}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: cleanedHtml }}
    />
  );
}

// Hilfsfunktion für Rundungsklassen
function getRoundedClass(rounded?: string | boolean): string {
  // Legacy: Unterstützung für boolean
  if (typeof rounded === "boolean") {
    return rounded ? "rounded-xl overflow-hidden" : "";
  }
  
  // Neue Enum-basierte Werte
  switch (rounded) {
    case "sm":
      return "rounded-sm overflow-hidden";
    case "md":
      return "rounded-md overflow-hidden";
    case "lg":
      return "rounded-lg overflow-hidden";
    case "full":
      return "rounded-full overflow-hidden";
    case "none":
    default:
      return "";
  }
}

// Hilfsfunktion für einzelne Bild-Rundung (ohne overflow-hidden)
function getImageRoundedClass(rounded?: string | boolean): string {
  // Legacy: Unterstützung für boolean
  if (typeof rounded === "boolean") {
    return rounded ? "rounded-xl" : "";
  }
  
  // Neue Enum-basierte Werte
  switch (rounded) {
    case "sm":
      return "rounded-sm";
    case "md":
      return "rounded-md";
    case "lg":
      return "rounded-lg";
    case "full":
      return "rounded-full";
    case "none":
    default:
      return "";
  }
}

// Spezielle Render-Funktion für Bilder in Tabellenzellen
function ImageBlockInTableCell({ data }: { data: ImageBlockData }) {
  const imageUrl = data.media?.url || data.src || "";
  const imageAlt = data.media?.alt || data.alt || "Bild";
  const imageCaption = data.media?.caption || data.caption;
  const aspect = data.aspect || "auto";
  const size = data.size ?? 100;
  const fullWidth = data.fullWidth || false;
  const fixedHeight = data.fixedHeight;
  const hasBorder = data.borderStyle && data.borderStyle !== "none";

  if (!imageUrl) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
        <p>Kein Bild ausgewählt</p>
      </div>
    );
  }

  // Rahmen-Styles als inline-Styles
  const getBorderInlineStyles = () => {
    const borderStyle = data.borderStyle || "none";
    const borderWidth = data.borderWidth || undefined;
    
    // Standard-Rahmenbreiten je nach Stil
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
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        };
      case "glow":
        return {
          backgroundColor: "white",
          border: `${finalBorderWidth} solid rgb(251, 113, 133)`,
          borderRadius: "0.75rem",
          boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.2), 0 0 0 1px rgba(244, 63, 94, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        };
      case "gradient":
        return {
          border: `${finalBorderWidth} solid transparent`,
          background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%) border-box",
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
  };

  const getBorderStyleClasses = () => {
    const borderStyle = data.borderStyle || "none";
    switch (borderStyle) {
      case "glass":
        return "hover:bg-white/90 hover:shadow-2xl hover:scale-[1.02]";
      case "glow":
        return "hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02]";
      case "gradient":
        return "table-cell-gradient hover:shadow-lg hover:scale-[1.02]";
      case "soft":
        return "hover:bg-gray-100 hover:shadow-lg hover:scale-[1.01]";
      case "minimal":
        return "hover:border-gray-400 hover:shadow-md hover:scale-[1.01]";
      case "floating":
        return "hover:shadow-3xl hover:-translate-y-1 hover:scale-[1.02]";
      case "custom":
        return data.customBorderStyle || "";
      default:
        return "";
    }
  };

  const aspectClasses: Record<string, string> = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "1:1": "aspect-square",
    auto: "",
  };

  const aspectClass = aspectClasses[aspect] || "";
  const roundedClass = getRoundedClass(data.rounded);
  const imageRoundedClass = getImageRoundedClass(data.rounded);
  const borderClasses = getBorderStyleClasses();
  const borderInlineStyles = getBorderInlineStyles();
  const useOriginalSize = aspect === "auto" && size === 100 && !fullWidth && !fixedHeight;

  // Wrapper mit Rahmen-Styles - negativer Margin kompensiert Zellen-Padding
  const borderPadding = data.borderPadding || "16px";
  const cellPadding = 16; // Standard-Zellen-Padding (könnte auch dynamisch sein)
  const borderPaddingValue = parseInt(borderPadding) || 16;
  
  const wrapperStyle: Record<string, any> = {
    display: "block",
    width: fullWidth ? "100%" : (size !== 100 ? `${size}%` : "100%"),
    position: "relative",
    zIndex: 10,
    ...(hasBorder ? {
      margin: `-${cellPadding}px`,
      padding: borderPadding,
      ...borderInlineStyles,
    } : {
      margin: fullWidth ? "0" : (size !== 100 ? "0 auto" : "0"),
    }),
  };

  return (
    <div style={wrapperStyle} className={hasBorder ? borderClasses : ""}>
      {useOriginalSize ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className={`max-w-full h-auto ${imageRoundedClass}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      ) : aspect === "auto" ? (
        <div 
          className={`relative w-full ${roundedClass}`} 
          style={{ 
            minHeight: fixedHeight || "200px",
            height: fixedHeight || undefined,
          }}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={`object-contain ${imageRoundedClass}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      ) : (
        <div 
          className={`relative w-full ${aspectClass} ${roundedClass}`}
          style={fixedHeight ? { height: fixedHeight } : {}}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={`object-cover ${imageRoundedClass}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      )}
      {imageCaption && (
        <figcaption className="text-sm text-gray-600 mt-2 text-center">
          {imageCaption}
        </figcaption>
      )}
    </div>
  );
}

function ImageBlock({ data }: { data: ImageBlockData }) {
  const imageUrl = data.media?.url || data.src || "";
  const imageAlt = data.media?.alt || data.alt || "Bild";
  const imageCaption = data.media?.caption || data.caption;
  const aspect = data.aspect || "auto";
  const size = data.size ?? 100; // Standard: 100% (Originalgröße)
  const fullWidth = data.fullWidth || false;
  const fixedHeight = data.fixedHeight;
  const hasBorder = data.borderStyle && data.borderStyle !== "none";

  if (!imageUrl) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
        <p>Kein Bild ausgewählt</p>
      </div>
    );
  }

  // Rahmen-Styles - alle als inline-Styles für maximale Kompatibilität
  const getBorderInlineStyles = () => {
    const borderStyle = data.borderStyle || "none";
    const borderWidth = data.borderWidth || undefined;
    
    // Standard-Rahmenbreiten je nach Stil
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
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          transition: "all 0.3s",
        };
      case "glow":
        return {
          backgroundColor: "white",
          border: `${finalBorderWidth} solid rgb(251, 113, 133)`,
          borderRadius: "0.75rem",
          boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.2), 0 0 0 1px rgba(244, 63, 94, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s",
        };
      case "gradient":
        return {
          border: `${finalBorderWidth} solid transparent`,
          background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%) border-box",
          backgroundClip: "padding-box, border-box",
          WebkitBackgroundClip: "padding-box, border-box",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s",
        };
      case "soft":
        return {
          backgroundColor: "rgb(249, 250, 251)",
          border: `${finalBorderWidth} solid rgba(229, 231, 235, 0.5)`,
          borderRadius: "1rem",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.1)",
          transition: "all 0.3s",
        };
      case "minimal":
        return {
          backgroundColor: "white",
          border: `${finalBorderWidth} solid rgba(209, 213, 219, 0.6)`,
          borderRadius: "0.5rem",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          transition: "all 0.3s",
        };
      case "floating":
        return {
          backgroundColor: "white",
          border: `${finalBorderWidth} solid rgb(243, 244, 246)`,
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          transition: "all 0.3s",
        };
      case "custom":
        return {};
      case "none":
      default:
        return {};
    }
  };

  // CSS-Klassen für Hover-Effekte
  const getBorderStyleClasses = () => {
    const borderStyle = data.borderStyle || "none";
    
    switch (borderStyle) {
      case "glass":
        return "hover:bg-white/90 hover:shadow-2xl hover:scale-[1.02]";
      case "glow":
        return "hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02]";
      case "gradient":
        return "table-cell-gradient hover:shadow-lg hover:scale-[1.02]";
      case "soft":
        return "hover:bg-gray-100 hover:shadow-lg hover:scale-[1.01]";
      case "minimal":
        return "hover:border-gray-400 hover:shadow-md hover:scale-[1.01]";
      case "floating":
        return "hover:shadow-3xl hover:-translate-y-1 hover:scale-[1.02]";
      case "custom":
        return data.customBorderStyle || "";
      case "none":
      default:
        return "";
    }
  };

  const aspectClasses: Record<string, string> = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "1:1": "aspect-square",
    auto: "",
  };

  const aspectClass = aspectClasses[aspect] || "";
  const roundedClass = getRoundedClass(data.rounded);
  const imageRoundedClass = getImageRoundedClass(data.rounded);
  const borderClasses = getBorderStyleClasses();
  const borderInlineStyles = getBorderInlineStyles();

  // Breiten-Style: fullWidth überschreibt size
  const widthStyle: Record<string, string> = fullWidth 
    ? { width: "100%" } 
    : size !== 100 
      ? { width: `${size}%`, margin: "0 auto" } 
      : {};

  // Höhen-Style: fixedHeight hat Priorität
  const heightStyle: Record<string, string> = fixedHeight 
    ? { height: fixedHeight } 
    : {};

  const useOriginalSize = aspect === "auto" && size === 100 && !fullWidth && !fixedHeight;

  // SPEZIELLE BEHANDLUNG FÜR BILDER IN TABELLENZELLEN MIT RAHMEN
  if (hasBorder) {
    const borderPadding = data.borderPadding || "16px";
    const cellPadding = 16; // Standard-Zellen-Padding
    
    return (
      <div
        style={{
          display: "block",
          width: "100%",
          margin: `-${cellPadding}px`,
          padding: borderPadding,
          position: "relative",
          zIndex: 10,
          ...borderInlineStyles,
        }}
        className={borderClasses}
      >
        <div style={{ width: "100%", height: fixedHeight || "auto" }}>
          {useOriginalSize ? (
            <img
              src={imageUrl}
              alt={imageAlt}
              className={`max-w-full h-auto ${imageRoundedClass}`}
              style={{ width: "100%", height: "auto" }}
            />
          ) : aspect === "auto" ? (
            <div 
              className={`relative w-full ${roundedClass}`} 
              style={{ 
                minHeight: fixedHeight || "200px",
                height: fixedHeight || undefined,
              }}
            >
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className={`object-contain ${imageRoundedClass}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          ) : (
            <div 
              className={`relative w-full ${aspectClass} ${roundedClass}`}
              style={fixedHeight ? { height: fixedHeight } : {}}
            >
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className={`object-cover ${imageRoundedClass}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          )}
        </div>
        {imageCaption && (
          <figcaption className="text-sm text-gray-600 mt-2 text-center">
            {imageCaption}
          </figcaption>
        )}
      </div>
    );
  }

  // NORMALE BEHANDLUNG FÜR BILDER OHNE RAHMEN ODER AUSSERHALB VON TABELLEN
  const borderPadding = data.borderPadding || "16px";
  
  const containerStyle: Record<string, any> = { 
    ...widthStyle, 
    ...heightStyle, 
    ...(hasBorder ? borderInlineStyles : {})
  };
  
  if (hasBorder) {
    containerStyle.display = "block";
    if (!widthStyle.width) {
      containerStyle.width = "100%";
    }
    containerStyle.position = "relative";
    containerStyle.zIndex = 1;
    containerStyle.boxSizing = "border-box";
    containerStyle.overflow = "visible";
    containerStyle.padding = borderPadding;
  }

  return (
    <figure className={`${hasBorder ? "" : roundedClass} ${borderClasses}`.trim()} style={containerStyle}>
      {useOriginalSize ? (
        <div className={`inline-block max-w-full ${roundedClass}`}>
          <img
            src={imageUrl}
            alt={imageAlt}
            className={`max-w-full h-auto ${imageRoundedClass}`}
            style={{ width: "auto", height: "auto" }}
          />
        </div>
      ) : aspect === "auto" ? (
        <div 
          className={`relative w-full ${roundedClass}`} 
          style={{ 
            minHeight: fixedHeight || "200px",
            height: fixedHeight || undefined,
          }}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={`object-contain ${imageRoundedClass}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      ) : (
        <div 
          className={`relative w-full ${aspectClass} ${roundedClass}`}
          style={fixedHeight ? { height: fixedHeight } : {}}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={`object-cover ${imageRoundedClass}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      )}
      {imageCaption && (
        <figcaption className="text-sm text-gray-600 mt-2 text-center">
          {imageCaption}
        </figcaption>
      )}
    </figure>
  );
}

function VideoBlock({ data }: { data: VideoBlockData }) {
  const videoUrl = data.media?.url || data.src || "";

  if (!videoUrl) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
        <p>Kein Video ausgewählt</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <video
        src={videoUrl}
        controls
        className="w-full h-auto rounded-xl"
        title={data.title}
      />
    </div>
  );
}

function FeaturesBlock({ data }: { data: FeaturesBlockData }) {
  const items = data.items || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <div key={index} className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {item.title}
          </h3>
          <p className="text-gray-600">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function TestimonialsBlock({ data }: { data: TestimonialsBlockData }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div key={index} className="p-6 bg-gray-50 rounded-lg border-l-4 border-rose-500">
          <p className="text-gray-700 mb-4">{item.text}</p>
          <p className="text-sm font-semibold text-gray-900">— {item.name}</p>
        </div>
      ))}
    </div>
  );
}

function CTABlock({ data }: { data: CTABlockData }) {
  const heading = data.heading || "";
  const text = data.text;
  const buttonLabel = data.buttonLabel || "Mehr erfahren";
  const buttonHref = data.buttonHref || "/";

  return (
    <div className="bg-rose-500 text-white p-8 rounded-lg text-center">
      <h2 className="text-3xl font-bold mb-4">{heading}</h2>
      {text && <p className="text-lg mb-6">{text}</p>}
      <a
        href={buttonHref}
        className="inline-block px-6 py-3 bg-white text-rose-500 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
      >
        {buttonLabel}
      </a>
    </div>
  );
}

function SpacerBlock({ data }: { data: SpacerBlockData }) {
  const sizeClass = {
    sm: "h-4",
    md: "h-8",
    lg: "h-16",
    xl: "h-24",
  }[data.size || "md"];

  return <div className={sizeClass} />;
}

function TableBlock({ data }: { data: TableBlockData }) {
  const rows = data.rows || [];
  const columnWidths = data.columnWidths || [];
  const rowSpacing = data.rowSpacing || "md";
  const columnSpacing = data.columnSpacing || "md";
  const cellPadding = data.cellPadding || "md";

  if (rows.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 border border-gray-200">
        <p className="text-sm">Tabelle ist leer</p>
      </div>
    );
  }

  const getColumnStyle = (index: number) => {
    if (columnWidths[index]) {
      return { width: columnWidths[index] };
    }
    return {};
  };

  // Berechne Zeilenabstand für borderSpacing
  const getRowSpacing = () => {
    if (rowSpacing === "custom" && data.customRowSpacing) {
      return data.customRowSpacing;
    }
    
    const spacingMap: Record<string, string> = {
      sm: "4px",
      md: "8px",
      lg: "16px",
      xl: "24px",
    };
    
    return spacingMap[rowSpacing] || spacingMap.md;
  };

  // Berechne Spaltenabstand für borderSpacing
  const getColumnSpacing = () => {
    if (columnSpacing === "custom" && data.customColumnSpacing) {
      return data.customColumnSpacing;
    }
    
    const spacingMap: Record<string, string> = {
      sm: "4px",
      md: "8px",
      lg: "16px",
      xl: "24px",
    };
    
    return spacingMap[columnSpacing] || spacingMap.md;
  };

  // Berechne Zellen-Padding
  const getCellPaddingStyle = () => {
    if (cellPadding === "custom" && data.customCellPadding) {
      return { padding: data.customCellPadding };
    }
    
    const paddingMap: Record<string, string> = {
      none: "0px",
      sm: "8px",
      md: "16px",
      lg: "24px",
      xl: "32px",
    };
    
    const padding = paddingMap[cellPadding] || paddingMap.md;
    return { padding };
  };

  // Moderne Rahmen-Stile basierend auf borderStyle mit Hover-Effekten
  const getBorderStyleClasses = (cell: TableCell) => {
    const borderStyle = cell.borderStyle || "none";
    
    switch (borderStyle) {
      case "glass":
        // Glassmorphism: Transparenter Hintergrund mit Blur-Effekt
        return "bg-white/70 backdrop-blur-md border border-white/30 rounded-2xl shadow-xl transition-all duration-300 hover:bg-white/90 hover:shadow-2xl hover:scale-[1.02]";
      case "glow":
        // Leuchtender Rahmen mit Schatten
        return "bg-white border-2 border-rose-400 rounded-xl shadow-lg transition-all duration-300 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-[1.02]";
      case "gradient":
        // Gradient-Rahmen - wird mit inline style ergänzt
        return "bg-white rounded-xl shadow-md relative transition-all duration-300 hover:shadow-lg hover:scale-[1.02] table-cell-gradient";
      case "soft":
        // Neumorphism: Weiche, erhabene Schatten
        return "bg-gray-50 rounded-2xl border border-gray-200/50 transition-all duration-300 hover:bg-gray-100 hover:shadow-lg hover:scale-[1.01]";
      case "minimal":
        // Minimalistischer dünner Rahmen
        return "bg-white border border-gray-300/60 rounded-lg shadow-sm transition-all duration-300 hover:border-gray-400 hover:shadow-md hover:scale-[1.01]";
      case "floating":
        // Schwebender Effekt mit großem Schatten
        return "bg-white rounded-2xl shadow-2xl border border-gray-100 transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 hover:scale-[1.02]";
      case "custom":
        return cell.customBorderStyle || "";
      case "none":
      default:
        return "";
    }
  };

  // Gradient-Style für gradient borderStyle
  const getGradientStyle = (cell: TableCell) => {
    if (cell.borderStyle === "gradient") {
      return {
        border: "2px solid transparent",
        background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%) border-box",
        backgroundClip: "padding-box, border-box",
      };
    }
    // Soft-Style: Neumorphism mit custom shadow
    if (cell.borderStyle === "soft") {
      return {
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.1)",
      };
    }
    // Glow-Style: Leuchtender Schatten (wird durch CSS-Klassen erweitert)
    if (cell.borderStyle === "glow") {
      return {
        boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.2), 0 0 0 1px rgba(244, 63, 94, 0.1)",
      };
    }
    // Floating-Style: Hover-Transform wird durch CSS-Klassen gehandhabt
    return {};
  };

  // Hintergrundfarbe-Style
  const getBackgroundStyle = (cell: TableCell) => {
    if (!cell.backgroundColor) return {};
    
    // Wenn es eine Hex-Farbe ist (beginnt mit #)
    if (cell.backgroundColor.startsWith("#")) {
      return { backgroundColor: cell.backgroundColor };
    }
    
    return {};
  };

  // Hintergrundfarbe als CSS-Klasse (falls nicht Hex)
  const getBackgroundClass = (cell: TableCell) => {
    if (!cell.backgroundColor) return "";
    if (cell.backgroundColor.startsWith("#")) return "";
    return cell.backgroundColor;
  };

  const rowSpacingValue = getRowSpacing();
  const columnSpacingValue = getColumnSpacing();
  const cellPaddingStyle = getCellPaddingStyle();

  // Bestimme die maximale Anzahl Spalten
  const maxColumns = rows.length > 0 ? Math.max(...rows.map(row => row.cells.length)) : 0;

  return (
    <div className="overflow-x-auto">
      <table 
        className="w-full" 
        style={{ 
          borderCollapse: "separate", 
          borderSpacing: `${columnSpacingValue} ${rowSpacingValue}`,
          tableLayout: columnWidths.length > 0 ? "fixed" : "auto",
        }}
      >
        {columnWidths.length > 0 && (
          <colgroup>
            {Array.from({ length: maxColumns }).map((_, index) => (
              <col key={index} style={getColumnStyle(index)} />
            ))}
          </colgroup>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.cells.map((cell, cellIndex) => {
                const borderClasses = getBorderStyleClasses(cell);
                const backgroundStyle = getBackgroundStyle(cell);
                const backgroundClass = getBackgroundClass(cell);
                const gradientStyle = getGradientStyle(cell);
                
                return (
                  <td
                    key={cellIndex}
                    style={{ 
                      ...cellPaddingStyle,
                      ...backgroundStyle,
                      ...gradientStyle,
                      overflow: "visible",
                    }}
                    className={`align-top ${borderClasses} ${backgroundClass}`.trim()}
                  >
                    <div className="space-y-4" style={{ position: "relative", zIndex: 0, overflow: "visible" }}>
                      {cell.blocks.map((block) => {
                        // Spezielle Behandlung für Bild-Blöcke in Tabellenzellen
                        if (block.type === "image") {
                          return <ImageBlockInTableCell key={block.id} data={block.data as ImageBlockData} />;
                        }
                        // Alle anderen Blöcke normal rendern
                        return <PageRenderer key={block.id} content={{ version: 1, blocks: [block] }} />;
                      })}
                      {cell.blocks.length === 0 && (
                        <div className="text-sm text-gray-400 italic">Leere Zelle</div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ data }: { data: SectionBlockData }) {
  const children = data.children || [];
  const layoutClass = data.layout === "narrow" ? "max-w-4xl mx-auto" : "";
  const backgroundClass = data.background === "soft" ? "bg-gray-50" : "";
  const paddingClass = {
    sm: "py-4",
    md: "py-8",
    lg: "py-12",
  }[data.padding || "md"] || "py-8";

  return (
    <section className={`${backgroundClass} ${paddingClass}`}>
      <div className={layoutClass}>
        {children.length > 0 ? (
          <div className="space-y-8">
            {children.map((child) => (
              <BlockRenderer key={child.id} block={child} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

