import { createBlockId } from "@/lib/page-builder/ids";
import { contentToPuck } from "./to-puck-data";
import type { PageContentPuck } from "@/lib/page-builder/schema";

/**
 * Reusable/Globale Blöcke (Feature 5): Referenz-Knoten `{ type: "Reusable",
 * props: { reusableId } }` werden vor dem Rendern in ihren Inhalt expandiert.
 *
 * ZYKLUSSCHUTZ (vom Review als Bug markiert — der alte Renderer trackte NICHTS):
 * Ein `visited`-Set der reusableIds wird durch die Rekursion gefädelt; eine
 * (transitive) Selbstreferenz wird zu einem sichtbaren Fehlerknoten statt Endlosrekursion.
 *
 * Loader ist injizierbar → rein testbar ohne DB. Geladener Inhalt (V1/V2/Puck) wird
 * über `contentToPuck` normalisiert (alte Reusable-Inhalte funktionieren weiter).
 */

export interface PuckNode {
  type: string;
  props: Record<string, unknown> & { id?: string };
}

export type ReusableLoader = (reusableId: string) => Promise<unknown | null>;

function isNodeArray(value: unknown): value is PuckNode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) => v != null && typeof v === "object" && "type" in v && "props" in v
    )
  );
}

function errorNode(message: string): PuckNode {
  const safe = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    type: "RichText",
    props: {
      id: createBlockId(),
      html: `<p style="color:#b91c1c">⚠ ${safe}</p>`,
    },
  };
}

async function resolveNodes(
  nodes: PuckNode[],
  loader: ReusableLoader,
  visited: Set<string>
): Promise<PuckNode[]> {
  const out: PuckNode[] = [];

  for (const node of nodes) {
    if (node.type === "Reusable") {
      const reusableId =
        typeof node.props.reusableId === "string" ? node.props.reusableId : "";
      if (!reusableId) {
        out.push(errorNode("Wiederverwendbarer Block ohne Referenz"));
        continue;
      }
      if (visited.has(reusableId)) {
        out.push(errorNode(`Zyklische Referenz erkannt (${reusableId})`));
        continue;
      }
      const loaded = await loader(reusableId);
      if (loaded == null) {
        out.push(errorNode(`Block nicht gefunden (${reusableId})`));
        continue;
      }
      const puck = contentToPuck(loaded);
      const nextVisited = new Set(visited);
      nextVisited.add(reusableId);
      const expanded = await resolveNodes(
        (puck.content as PuckNode[]) ?? [],
        loader,
        nextVisited
      );
      out.push(...expanded);
      continue;
    }

    // Slot-Props rekursiv auflösen.
    const props: Record<string, unknown> = { ...node.props };
    for (const [key, value] of Object.entries(props)) {
      if (isNodeArray(value)) {
        props[key] = await resolveNodes(value, loader, visited);
      }
    }
    out.push({ type: node.type, props: props as PuckNode["props"] });
  }

  return out;
}

/** Expandiert alle Reusable-Referenzen im Baum (zyklensicher). */
export async function resolveReusableTree(
  data: PageContentPuck,
  loader: ReusableLoader
): Promise<PageContentPuck> {
  const content = await resolveNodes(
    (data?.content as PuckNode[]) ?? [],
    loader,
    new Set<string>()
  );
  return { ...data, version: 3, content };
}
