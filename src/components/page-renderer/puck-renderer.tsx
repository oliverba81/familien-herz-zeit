import type { ReactNode } from "react";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { getResponsiveClasses } from "@/lib/puck/responsive";
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
      return (
        <section className={className}>
          {(resolved.children as ReactNode) ?? null}
        </section>
      );
    }

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
