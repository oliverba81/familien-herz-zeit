import { describe, it, expect } from "vitest";
import {
  getV2EmbedPlaceholderHtml,
  findEmbedInHtmlById,
  updateEmbedDataInHtml,
} from "./v2-embed-defaults";

describe("getV2EmbedPlaceholderHtml – Label im span (vorwärtskompatibel)", () => {
  it("rendert das Label in <span class='fhz-embed-label'>", () => {
    const html = getV2EmbedPlaceholderHtml("courses", undefined, "abc");
    expect(html).toContain('class="fhz-embed-label"');
    expect(html).toContain('data-fhz-block="courses"');
    expect(html).toContain('data-fhz-block-id="abc"');
    // Genau ein schließendes </div> (Label-span darf kein div sein).
    expect(html.match(/<\/div>/g)?.length).toBe(1);
  });

  it("findEmbedInHtmlById findet den Block trotz span-Label", () => {
    const html = getV2EmbedPlaceholderHtml(
      "current-appointments",
      { title: "Test" },
      "id-1"
    );
    const found = findEmbedInHtmlById(html, "id-1");
    expect(found?.blockType).toBe("current-appointments");
    expect(found?.data).toMatchObject({ title: "Test" });
  });

  it("updateEmbedDataInHtml aktualisiert die Daten und erhält das span-Label", () => {
    const html = getV2EmbedPlaceholderHtml("courses", { maxCourses: 1 }, "id-2");
    const updated = updateEmbedDataInHtml(html, "id-2", { maxCourses: 5 });
    expect(updated).toContain('class="fhz-embed-label"');
    const found = findEmbedInHtmlById(updated, "id-2");
    expect(found?.data).toMatchObject({ maxCourses: 5 });
  });
});
