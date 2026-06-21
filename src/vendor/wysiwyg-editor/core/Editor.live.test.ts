// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { Editor } from "./Editor";

beforeAll(() => {
  // jsdom implementiert document.execCommand nicht – für die Editor-Konstruktion stubben.
  if (typeof document.execCommand !== "function") {
    (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
  }
});

function makeEditor(initialHTML: string): Editor {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new Editor({ container, initialHTML, sanitize: false });
}

describe("Editor.getHTML – Live-Embed-Stripping", () => {
  it("entfernt [data-fhz-live]-Container aus der serialisierten Ausgabe", () => {
    const ed = makeEditor(
      '<div data-fhz-block="courses" class="fhz-embed" contenteditable="false"><span class="fhz-embed-label">📅 Kurse</span></div>'
    );
    const ph = ed.editorEl.querySelector("[data-fhz-block]") as HTMLElement;
    const live = document.createElement("div");
    live.setAttribute("data-fhz-live", "");
    live.innerHTML = "<p>LIVE CONTENT</p>";
    ph.appendChild(live);

    const html = ed.getHTML();
    expect(html).not.toContain("data-fhz-live");
    expect(html).not.toContain("LIVE CONTENT");
    expect(html).toContain('data-fhz-block="courses"');
    expect(html).toContain("fhz-embed-label");
    ed.destroy();
  });

  it("nutzt den Fast-Path ohne Live-Container", () => {
    const ed = makeEditor("<p>Hallo Welt</p>");
    const html = ed.getHTML();
    expect(html).toContain("Hallo Welt");
    expect(html).not.toContain("data-fhz-live");
    ed.destroy();
  });

  it("pauseHistory/resumeHistory sind verfügbar und werfen nicht", () => {
    const ed = makeEditor("<p>x</p>");
    expect(() => {
      ed.pauseHistory();
      ed.editorEl.querySelector("p")?.setAttribute("data-test", "1");
      ed.resumeHistory();
    }).not.toThrow();
    ed.destroy();
  });
});
