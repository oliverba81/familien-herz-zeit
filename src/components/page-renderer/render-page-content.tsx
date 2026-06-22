import {
  resolveContentKind,
  parsePageContent,
  type PageContentPuck,
} from "@/lib/page-builder/schema";
import PageRendererServer from "./page-renderer-server";
import PageRendererHtml from "./page-renderer-html";
import PuckRenderer from "./puck-renderer";
import { resolveReusableTree } from "@/lib/puck/reusable";
import { loadReusableContent } from "@/lib/puck/reusable-loader";

/**
 * Zentrale Renderer-Auswahl über den einzigen Content-Form-Guard.
 *
 * P0-f: Puck-Daten (V3) NICHT durch parsePageContent schicken (würde leeren Inhalt
 * liefern). Genutzt von allen Render-Stellen (`[...slug]`, Homepage, Preview).
 *
 * Für Puck werden Reusable-Referenzen serverseitig (zyklensicher) expandiert.
 */
export default async function RenderPageContent({ content }: { content: unknown }) {
  const kind = resolveContentKind(content);
  if (kind === "puck") {
    let data = content as PageContentPuck;
    try {
      data = await resolveReusableTree(data, loadReusableContent);
    } catch {
      // Bei DB-Fehler unaufgelösten Baum rendern (Reusable → Unknown-Fallback) statt Crash.
    }
    return <PuckRenderer data={data} />;
  }
  if (kind === "v2") {
    return <PageRendererHtml html={(content as { html: string }).html} />;
  }
  return <PageRendererServer content={parsePageContent(content)} />;
}
