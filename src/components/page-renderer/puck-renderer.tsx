import type { ReactNode } from "react";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { getResponsiveClasses } from "@/lib/puck/responsive";
import { SPACER_SIZES, SECTION_MAXWIDTH, sectionStyle } from "@/lib/puck/blocks";
import {
  FeaturesView,
  TestimonialsView,
  ImageView,
  ButtonView,
  EmbedView,
  AccordionView,
  GalleryView,
  columnsContainerStyle,
  type ImageViewProps,
  type ButtonViewProps,
} from "./puck-blocks";
import { TabsView } from "./tabs-view";
import type { PageContentPuck } from "@/lib/page-builder/schema";
import CoursesBlock from "@/components/courses/courses-block";
import CurrentAppointmentsBlock from "@/components/courses/current-appointments-block";
import HerzZeitStoryBlock from "@/components/stories/herzzeit-story-block";
import ContactFormBlock from "./contact-form-block";
import type {
  CoursesBlockData,
  CurrentAppointmentsBlockData,
  HerzZeitStoryBlockData,
  ContactFormBlockData,
} from "@/lib/page-builder/types";

/**
 * Eigener Server-Tree-Walker für Puck-Daten (V3).
 *
 * Bewusst NICHT Pucks `<Render>`: unsere Embeds (`CoursesBlock`/`CurrentAppointmentsBlock`)
 * sind async Prisma-Server-Komponenten und passen nicht in Pucks Resolver-Modell. Der Walker
 * rendert dieselben Komponenten serverseitig → SSR + echte Daten bleiben erhalten, 1:1 zum Editor.
 *
 * Slots (verschachtelte Layouts) liegen ab Puck 0.19 als `ComponentData[]` inline in den Props.
 */

export interface PuckNode {
  type: string;
  props: Record<string, unknown> & { id?: string };
}

/** Erkennt ein Slot-Prop: Array aus Komponenten-Daten ({ type, props }). */
function isSlotArray(value: unknown): value is PuckNode[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (v) =>
        v != null &&
        typeof v === "object" &&
        "type" in (v as object) &&
        "props" in (v as object)
    )
  );
}

function renderContent(nodes: PuckNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${node.props?.id ?? i}`;
    const cls = getResponsiveClasses(node.props ?? {});
    const el = <RenderNode node={node} index={i} />;
    // Responsive-Sichtbarkeit: nur umhüllen, wenn Flags gesetzt sind.
    return cls ? (
      <div key={key} className={cls}>
        {el}
      </div>
    ) : (
      <span key={key} style={{ display: "contents" }}>
        {el}
      </span>
    );
  });
}

function RenderNode({ node, index }: { node: PuckNode; index: number }): ReactNode {
  const { type, props } = node;
  const baseKey = String(props?.id ?? index);

  // Slot-Props zu gerenderten React-Kindern auflösen.
  const resolved: Record<string, unknown> = { ...props };
  for (const [key, value] of Object.entries(props)) {
    if (isSlotArray(value)) {
      resolved[key] = renderContent(value, `${baseKey}-${key}`);
    }
  }

  switch (type) {
    case "RichText":
      return (
        <div
          className="tinymce-preview-content prose max-w-none text-md"
          dangerouslySetInnerHTML={{
            __html: cleanAndConvertHtml(String(props.html ?? "")),
          }}
        />
      );

    case "Section": {
      const className = typeof resolved.className === "string" ? resolved.className : undefined;
      const inner = SECTION_MAXWIDTH[String(props.maxWidth)] || undefined;
      return (
        <section
          id={(props.anchorId as string) || undefined}
          className={className}
          style={sectionStyle({
            background: props.background as string,
            backgroundImage: props.backgroundImage as string,
            padding: props.padding as string,
          })}
        >
          <div className={inner}>{(resolved.children as ReactNode) ?? null}</div>
        </section>
      );
    }

    case "Heading": {
      const lvl = [1, 2, 3, 4, 5, 6].includes(Number(props.level)) ? Number(props.level) : 2;
      const Tag = `h${lvl}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag style={{ textAlign: (props.align as "left" | "center" | "right") || "left" }}>
          {String(props.text ?? "")}
        </Tag>
      );
    }

    case "Divider":
      return <hr className="my-6 border-gray-200" />;

    case "Features":
      return (
        <FeaturesView
          title={props.title as string}
          items={props.items as { title?: string; text?: string }[]}
        />
      );

    case "Testimonials":
      return (
        <TestimonialsView
          title={props.title as string}
          items={props.items as { name?: string; text?: string }[]}
        />
      );

    case "Columns": {
      const count = Number(props.count) >= 3 ? 3 : 2;
      return (
        <div
          className="fhz-columns"
          style={columnsContainerStyle(count, props.ratio as string, props.gap as string)}
        >
          <div>{(resolved.col1 as ReactNode) ?? null}</div>
          <div>{(resolved.col2 as ReactNode) ?? null}</div>
          {count >= 3 ? <div>{(resolved.col3 as ReactNode) ?? null}</div> : null}
        </div>
      );
    }

    case "Spacer":
      return <div style={{ height: SPACER_SIZES[String(props.size)] ?? SPACER_SIZES.md }} />;

    case "Image":
      return <ImageView {...(props as unknown as ImageViewProps)} />;

    case "Button":
      return <ButtonView {...(props as unknown as ButtonViewProps)} />;

    case "Embed":
      return <EmbedView url={props.url as string} title={props.title as string} />;

    case "Accordion":
      return <AccordionView items={props.items as { question?: string; answer?: string }[]} />;

    case "Tabs":
      return <TabsView items={props.items as { label?: string; content?: string }[]} />;

    case "Gallery":
      return (
        <GalleryView
          items={props.items as { src?: string; alt?: string }[]}
          columns={props.columns as number}
        />
      );

    case "Video":
      return props.src ? (
        <figure>
          { }
          <video src={String(props.src)} controls style={{ width: "100%", height: "auto" }} />
          {props.title ? <figcaption>{String(props.title)}</figcaption> : null}
        </figure>
      ) : null;

    case "Courses":
      return <CoursesBlock data={props as unknown as CoursesBlockData} />;
    case "CurrentAppointments":
      return (
        <CurrentAppointmentsBlock data={props as unknown as CurrentAppointmentsBlockData} />
      );
    case "HerzZeitStory":
      return <HerzZeitStoryBlock data={props as unknown as HerzZeitStoryBlockData} />;
    case "ContactForm":
      return <ContactFormBlock data={props as unknown as ContactFormBlockData} />;

    case "Reusable":
      // Sollte live bereits via resolveReusableTree expandiert sein; falls nicht,
      // nichts rendern (kein roher Platzhalter auf der veröffentlichten Seite).
      return null;

    default:
      // Unbekannter Typ → kein Crash, sichtbarer Hinweis (konsistent zu page-renderer-server).
      return (
        <div className="p-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
          Unbekannter Block-Typ: {type}
        </div>
      );
  }
}

interface PuckRendererProps {
  data: PageContentPuck;
}

export default function PuckRenderer({ data }: PuckRendererProps) {
  const content = (data?.content as PuckNode[]) ?? [];
  if (content.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }
  return <div className="space-y-6">{renderContent(content, "root")}</div>;
}
