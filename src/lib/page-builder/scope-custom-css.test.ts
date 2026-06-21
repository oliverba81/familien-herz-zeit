import { describe, it, expect } from "vitest";
import { scopeCustomCssForEditor } from "./scope-custom-css";

describe("scopeCustomCssForEditor", () => {
  it("wrappt das CSS in @scope (.wysiwyg-editor-area)", () => {
    const out = scopeCustomCssForEditor(".fhz-hero{color:red}");
    expect(out.startsWith("@scope (.wysiwyg-editor-area) {")).toBe(true);
    expect(out).toContain(".fhz-hero{color:red}");
    expect(out.trimEnd().endsWith("}")).toBe(true);
  });

  it("bildet :root auf :scope ab (Design-Tokens greifen in der Vorschau)", () => {
    const out = scopeCustomCssForEditor(":root{--brand:#c0363b}.fhz-btn{color:var(--brand)}");
    expect(out).toContain(":scope{--brand:#c0363b}");
    expect(out).not.toMatch(/(^|[\s,{}>~+]):root\b/);
    // Variablen-Nutzung bleibt unangetastet
    expect(out).toContain("var(--brand)");
  });

  it("bildet html/body-Selektoren auf :scope ab", () => {
    const out = scopeCustomCssForEditor("body { background: #fff } html.dark { color: #000 }");
    expect(out).toContain(":scope { background: #fff }");
    expect(out).toContain(":scope.dark { color: #000 }");
  });

  it("lässt ähnliche Klassennamen unberührt (.fhz-body, tbody)", () => {
    const out = scopeCustomCssForEditor(".fhz-body{margin:0} tbody td{padding:0}");
    expect(out).toContain(".fhz-body{margin:0}");
    expect(out).toContain("tbody td{padding:0}");
  });

  it("erhält @media-Blöcke", () => {
    const out = scopeCustomCssForEditor("@media (max-width:768px){.fhz-hero{min-height:45vh}}");
    expect(out).toContain("@media (max-width:768px)");
    expect(out).toContain(".fhz-hero{min-height:45vh}");
  });
});
