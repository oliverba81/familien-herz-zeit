import { describe, it, expect } from "vitest";
import { resolveReusableTree, type ReusableLoader, type PuckNode } from "./reusable";
import type { PageContentPuck } from "@/lib/page-builder/schema";

function puck(content: unknown[]): PageContentPuck {
  return { version: 3, root: { props: {} }, content } as PageContentPuck;
}

/** Mock-Loader aus einer Map reusableId → gespeicherter Inhalt. */
function makeLoader(blocks: Record<string, unknown>): ReusableLoader {
  return async (id: string) => blocks[id] ?? null;
}

describe("resolveReusableTree", () => {
  it("expandiert eine Referenz in ihren Inhalt (V2-HTML)", async () => {
    const loader = makeLoader({ b1: { version: 2, html: "<p>Geteilt</p>" } });
    const out = await resolveReusableTree(
      puck([{ type: "Reusable", props: { id: "x", reusableId: "b1" } }]),
      loader
    );
    expect(out.content.map((n: any) => n.type)).toContain("RichText");
    const html = (out.content[0] as any).props.html;
    expect(html).toContain("Geteilt");
  });

  it("expandiert transitive Referenzen (A → B)", async () => {
    const loader = makeLoader({
      a: { version: 3, root: { props: {} }, content: [{ type: "Reusable", props: { id: "r", reusableId: "b" } }] },
      b: { version: 2, html: "<p>Tief</p>" },
    });
    const out = await resolveReusableTree(
      puck([{ type: "Reusable", props: { id: "x", reusableId: "a" } }]),
      loader
    );
    expect((out.content[0] as any).props.html).toContain("Tief");
  });

  it("bricht Zyklen ab (A → A) ohne Endlosrekursion", async () => {
    const loader = makeLoader({
      a: { version: 3, root: { props: {} }, content: [{ type: "Reusable", props: { id: "r", reusableId: "a" } }] },
    });
    const out = await resolveReusableTree(
      puck([{ type: "Reusable", props: { id: "x", reusableId: "a" } }]),
      loader
    );
    const html = (out.content[0] as any).props.html ?? "";
    expect(html).toMatch(/Zyklische Referenz/);
  });

  it("zeigt Fehlerknoten für fehlende Blöcke", async () => {
    const out = await resolveReusableTree(
      puck([{ type: "Reusable", props: { id: "x", reusableId: "weg" } }]),
      makeLoader({})
    );
    expect((out.content[0] as any).props.html).toMatch(/nicht gefunden/);
  });

  it("löst Referenzen auch in Section-Slots auf", async () => {
    const loader = makeLoader({ b1: { version: 2, html: "<p>Im Slot</p>" } });
    const out = await resolveReusableTree(
      puck([
        {
          type: "Section",
          props: {
            id: "s",
            children: [{ type: "Reusable", props: { id: "r", reusableId: "b1" } }],
          },
        },
      ]),
      loader
    );
    const children = (out.content[0] as any).props.children as PuckNode[];
    expect((children[0] as any).props.html).toContain("Im Slot");
  });

  it("lässt normale Knoten unverändert", async () => {
    const out = await resolveReusableTree(
      puck([{ type: "RichText", props: { id: "r", html: "<p>Normal</p>" } }]),
      makeLoader({})
    );
    expect((out.content[0] as any).props.html).toBe("<p>Normal</p>");
  });
});
