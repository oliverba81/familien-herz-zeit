import {
  resolveContentKind,
  parsePageContent,
  type PageContentPuck,
} from "@/lib/page-builder/schema";
import PageRendererServer from "./page-renderer-server";
import PageRendererHtml from "./page-renderer-html";
import PuckRenderer from "./puck-renderer";

/**
 * Zentrale Renderer-Auswahl über den einzigen Content-Form-Guard.
 *
 * P0-f: Puck-Daten (V3) NICHT durch parsePageContent schicken (würde leeren Inhalt
 * liefern). Genutzt von allen Render-Stellen (`[...slug]`, Homepage, Preview).
 */
export default function RenderPageContent({ content }: { content: unknown }) {
  const kind = resolveContentKind(content);
  if (kind === "puck") {
    return <PuckRenderer data={content as PageContentPuck} />;
  }
  if (kind === "v2") {
    return <PageRendererHtml html={(content as { html: string }).html} />;
  }
  return <PageRendererServer content={parsePageContent(content)} />;
}
