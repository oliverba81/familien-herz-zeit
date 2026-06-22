import { describe, it, expect } from "vitest";
import {
  resolveContentKind,
  isPageContentPuck,
  isPageContentV2,
  parsePageContent,
  type PageContentPuck,
} from "./schema";

const v1 = { version: 1 as const, blocks: [{ id: "a", type: "text", data: { text: "hi" } }] };
const v2 = { version: 2 as const, html: "<p>hallo</p>" };
const puckTagged: PageContentPuck = {
  version: 3,
  root: { props: { title: "Seite" } },
  content: [{ type: "Section", props: { id: "s1" } }],
};
const puckUntagged = {
  root: { props: {} },
  content: [{ type: "RichText", props: { id: "r1", html: "<p>x</p>" } }],
};

describe("resolveContentKind", () => {
  it("erkennt V1", () => {
    expect(resolveContentKind(v1)).toBe("v1");
  });

  it("erkennt V2 (WYSIWYG HTML)", () => {
    expect(resolveContentKind(v2)).toBe("v2");
  });

  it("erkennt Puck mit version:3-Tag", () => {
    expect(resolveContentKind(puckTagged)).toBe("puck");
  });

  it("erkennt Puck strukturell ohne version-Tag", () => {
    expect(resolveContentKind(puckUntagged)).toBe("puck");
  });

  it("klassifiziert null/undefined/leeres Objekt als v1 (Fallback)", () => {
    expect(resolveContentKind(null)).toBe("v1");
    expect(resolveContentKind(undefined)).toBe("v1");
    expect(resolveContentKind({})).toBe("v1");
  });
});

describe("isPageContentPuck", () => {
  it("true für Puck-Daten (getaggt + strukturell)", () => {
    expect(isPageContentPuck(puckTagged)).toBe(true);
    expect(isPageContentPuck(puckUntagged)).toBe(true);
  });

  it("false für V1/V2 (auch wenn zufällig root/content vorhanden wären)", () => {
    expect(isPageContentPuck(v1)).toBe(false);
    expect(isPageContentPuck(v2)).toBe(false);
    expect(isPageContentPuck({ version: 1, root: {}, content: [] })).toBe(false);
    expect(isPageContentPuck({ version: 2, html: "", root: {}, content: [] })).toBe(false);
  });
});

describe("REGRESSION: Puck-Daten dürfen nicht in den V1-Migrationspfad fallen", () => {
  it("resolveContentKind hält Puck von 'v1' fern", () => {
    // Würde Puck als 'v1' gelten, liefe es in parsePageContent → migrateToV1 → leere Seite.
    expect(resolveContentKind(puckTagged)).not.toBe("v1");
    expect(resolveContentKind(puckUntagged)).not.toBe("v1");
  });

  it("Beleg der Gefahr: parsePageContent würde Puck-Daten zu leer machen", () => {
    // Dokumentiert, WARUM der Guard existiert: parsePageContent kennt nur V1.
    const parsed = parsePageContent(puckTagged);
    expect(parsed).toEqual({ version: 1, blocks: [] });
    // Genau deshalb MUSS jeder Schreibpfad vorher resolveContentKind nutzen.
  });

  it("isPageContentV2 bleibt unberührt von Puck", () => {
    expect(isPageContentV2(puckTagged)).toBe(false);
  });
});
