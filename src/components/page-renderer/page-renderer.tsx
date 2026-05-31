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
  HerzZeitStoryBlockData,
  ContactFormBlockData,
} from "@/lib/page-builder/types";
import { PageContentV1 } from "@/lib/page-builder/schema";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import Image from "next/image";
import HerzZeitStoryBlock from "@/components/stories/herzzeit-story-block";
import ContactFormBlock from "./contact-form-block";
// ReusableBlockRenderer ist ein Server Component - wird nur in Server Components verwendet
// Im Client (Builder) rendern wir einen Placeholder

interface PageRendererProps {
  content: PageContentV1;
}

export default function PageRenderer({ content }: PageRendererProps) {
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

function BlockRenderer({ block }: { block: Block }) {
  try {
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
    case "reusable": {
      // Im Client (Builder) zeigen wir einen Placeholder
      // Server-side wird ReusableBlockRenderer verwendet
      const data = block.data as ReusableBlockData;
      return (
        <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
          <p className="text-sm font-medium text-blue-800">
            🔄 Reusable Block
          </p>
          {data.reusableId && (
            <p className="text-xs text-blue-600 mt-1">ID: {data.reusableId}</p>
          )}
        </div>
      );
    }
    case "courses": {
      // Im Client (Builder) zeigen wir einen Placeholder
      // Server-side wird CoursesBlock verwendet
      return (
        <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
          <p className="text-sm font-medium text-green-800">
            📅 Kurse & Termine Block
          </p>
          <p className="text-xs text-green-600 mt-1">
            Zeigt aktuelle Kurse aus dem Kalender
          </p>
        </div>
      );
    }
    case "current-appointments": {
      // Im Client (Builder) zeigen wir einen Placeholder
      // Server-side wird CurrentAppointmentsBlock verwendet
      return (
        <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
          <p className="text-sm font-medium text-blue-800">
            📋 Aktuelle Termine Block
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Dieser Block zeigt aktuelle Termine basierend auf den ausgewählten Kursarten an.
          </p>
        </div>
      );
    }
    case "herzzeit-story": {
      // Client Component mit Modal - im Page Builder deaktivieren
      return <HerzZeitStoryBlock data={block.data as HerzZeitStoryBlockData} disableModal={true} />;
    }
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
  } catch (error) {
    console.error("Error rendering block:", error, block);
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
}

function HeroBlock({ data }: { data: HeroBlockData }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[data.align || "center"];

  return (
    <div className={`bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-12 ${alignClass}`}>
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        {data.heading || "Überschrift"}
      </h2>
      {data.subheading && (
        <p className="text-xl text-gray-700">{data.subheading}</p>
      )}
    </div>
  );
}

function TextBlock({ data }: { data: TextBlockData }) {
  // Prüfe ob Text HTML enthält
  const text = data.text || "";
  const hasHtml = /<[^>]+>/.test(text);

  if (hasHtml) {
    // Bereinige und konvertiere Links
    const cleanedHtml = cleanAndConvertHtml(text);
    
    // Rendere HTML sicher
    return (
      <div 
        className="prose max-w-none prose-a:text-rose-600 prose-a:hover:text-rose-700 prose-a:underline"
        dangerouslySetInnerHTML={{ __html: cleanedHtml }}
      />
    );
  }

  // Normale Text-Darstellung
  return (
    <div className="prose max-w-none">
      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
        {text}
      </div>
    </div>
  );
}

function RichTextBlock({ data }: { data: RichTextBlockData }) {
  const html = data.html || "";
  
  if (!html || html.trim() === "" || html === "<p></p>") {
    return null;
  }

  // Bereinige und konvertiere Links (Layout/Styles aus TinyMCE bleiben erhalten)
  const cleanedHtml = cleanAndConvertHtml(html);
  
  return (
    <div
      className="tinymce-preview-content max-w-none"
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

// Spezielle Render-Funktion für Bilder in Tabellenzellen (Client)
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
  const cellPadding = 16; // Standard-Zellen-Padding
  
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
  // Unterstütze sowohl neue MediaRef Struktur als auch Legacy src
  const media = data.media || (data.src ? { url: data.src, alt: data.alt || "", caption: data.caption || "" } : null);
  const imageUrl = media?.url;
  const imageAlt = media?.alt || data.alt || "";
  const imageCaption = media?.caption || data.caption || "";
  const aspect = data.aspect || "auto";
  const rounded = data.rounded || false;
  const size = data.size ?? 100; // Standard: 100% (Originalgröße)
  const fullWidth = data.fullWidth || false;
  const fixedHeight = data.fixedHeight;
  const hasBorder = data.borderStyle && data.borderStyle !== "none";

  if (!imageUrl) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500 border border-gray-200">
        <p className="text-sm">Kein Medium gewählt</p>
      </div>
    );
  }

  // Rahmen-Styles als inline-Styles
  const getBorderInlineStyles = () => {
    const borderStyle = data.borderStyle || "none";
    
    switch (borderStyle) {
      case "glass":
        return {
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "1rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        };
      case "glow":
        return {
          backgroundColor: "white",
          border: "2px solid rgb(251, 113, 133)",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.2), 0 0 0 1px rgba(244, 63, 94, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        };
      case "gradient":
        return {
          border: "2px solid transparent",
          background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%) border-box",
          backgroundClip: "padding-box, border-box",
          WebkitBackgroundClip: "padding-box, border-box",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        };
      case "soft":
        return {
          backgroundColor: "rgb(249, 250, 251)",
          border: "1px solid rgba(229, 231, 235, 0.5)",
          borderRadius: "1rem",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.1)",
        };
      case "minimal":
        return {
          backgroundColor: "white",
          border: "1px solid rgba(209, 213, 219, 0.6)",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        };
      case "floating":
        return {
          backgroundColor: "white",
          border: "1px solid rgb(243, 244, 246)",
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

  const aspectClasses = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "1:1": "aspect-square",
    "auto": "",
  };

  const aspectClass = aspectClasses[aspect];
  const roundedClass = getRoundedClass(data.rounded);
  const imageRoundedClass = getImageRoundedClass(data.rounded);
  const borderClasses = getBorderStyleClasses();
  const borderInlineStyles = getBorderInlineStyles();
  const useOriginalSize = aspect === "auto" && size === 100 && !fullWidth && !fixedHeight;

  const borderPadding = data.borderPadding || "16px";
  
  const containerStyle: Record<string, any> = {
    ...(size !== 100 && !fullWidth ? { width: `${size}%`, margin: "0 auto" } : fullWidth ? { width: "100%" } : {}),
    ...(fixedHeight ? { height: fixedHeight } : {}),
    ...(hasBorder ? borderInlineStyles : {}),
  };

  if (hasBorder) {
    containerStyle.display = "block";
    if (!containerStyle.width) {
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
            className={`max-w-full h-auto ${data.rounded ? "rounded-xl" : ""}`}
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
            className={`object-contain ${data.rounded ? "rounded-xl" : ""}`}
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
            className={`object-cover ${data.rounded ? "rounded-xl" : ""}`}
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
  // Unterstütze sowohl neue MediaRef Struktur als auch Legacy src
  const media = data.media || (data.src ? { url: data.src } : null);
  const videoUrl = media?.url || data.src;

  if (!videoUrl) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500 border border-gray-200">
        <p className="text-sm">Kein Medium gewählt</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.title && (
        <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
      )}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <video
          src={videoUrl}
          controls
          className="w-full h-auto"
        >
          Ihr Browser unterstützt das Video-Element nicht.
        </video>
      </div>
    </div>
  );
}

function FeaturesBlock({ data }: { data: FeaturesBlockData }) {
  const items = data.items || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <div
          key={index}
          className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
        >
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div
          key={index}
          className="p-6 bg-rose-50 rounded-lg border-l-4 border-rose-500"
        >
          <p className="text-gray-700 mb-4 italic">"{item.text}"</p>
          <p className="text-sm font-semibold text-gray-900">— {item.name}</p>
        </div>
      ))}
    </div>
  );
}

function CTABlock({ data }: { data: CTABlockData }) {
  return (
    <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-12 text-center text-white">
      <h2 className="text-3xl font-bold mb-4">{data.heading || "Call to Action"}</h2>
      {data.text && <p className="text-xl mb-6 opacity-90">{data.text}</p>}
      <a
        href={data.buttonHref || "#"}
        className="inline-block bg-white text-rose-500 font-semibold px-8 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
      >
        {data.buttonLabel || "Jetzt starten"}
      </a>
    </div>
  );
}

function SpacerBlock({ data }: { data: SpacerBlockData }) {
  const sizeMap: Record<string, string> = {
    sm: "h-4",
    md: "h-8",
    lg: "h-16",
    xl: "h-24",
  };
  const size = data.size || "md";
  return <div className={sizeMap[size] || sizeMap.md} />;
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

  // Erstelle Spaltenbreiten-Style
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

  // Gradient-Style für gradient borderStyle (wird durch CSS-Klassen für Hover erweitert)
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
    
    // Ansonsten wird es als CSS-Klasse behandelt (wird in className verwendet)
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
                        return <BlockRenderer key={block.id} block={block} />;
                      })}
                      {cell.blocks.length === 0 && (
                        <div className="text-sm text-gray-400 italic">
                          Leere Zelle
                        </div>
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