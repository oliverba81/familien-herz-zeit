// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { puckConfig, PUCK_TO_V2_EMBED } from "./config";

const EXPECTED = [
  "RichText",
  "Section",
  "Image",
  "Courses",
  "CurrentAppointments",
  "HerzZeitStory",
  "ContactForm",
  "Columns",
  "Spacer",
  "Button",
  "Video",
  "Heading",
  "Divider",
  "Features",
  "Testimonials",
  "Embed",
  "Accordion",
  "Tabs",
  "Gallery",
  "Reusable",
];

describe("puckConfig", () => {
  it("registriert alle erwarteten Komponenten", () => {
    for (const name of EXPECTED) {
      expect(puckConfig.components[name]).toBeTruthy();
    }
  });

  it("jede Komponente hat render + fields", () => {
    for (const name of EXPECTED) {
      const comp = puckConfig.components[name];
      expect(typeof comp.render).toBe("function");
      expect(comp.fields && typeof comp.fields).toBe("object");
    }
  });

  it("Responsive-Sichtbarkeitsfelder sind überall gespreizt", () => {
    for (const name of EXPECTED) {
      const fields = puckConfig.components[name].fields!;
      expect(fields.hideMobile).toBeTruthy();
      expect(fields.hideTablet).toBeTruthy();
      expect(fields.hideDesktop).toBeTruthy();
    }
  });

  it("Embeds haben nicht-leere Defaults aus der Registry", () => {
    for (const name of ["Courses", "CurrentAppointments", "HerzZeitStory", "ContactForm"]) {
      const dp = puckConfig.components[name].defaultProps as Record<string, unknown>;
      expect(Object.keys(dp).length).toBeGreaterThan(3);
    }
  });

  it("Embed-Mapping deckt die vier V2-Typen ab", () => {
    expect(Object.values(PUCK_TO_V2_EMBED).sort()).toEqual(
      ["contactForm", "courses", "current-appointments", "herzzeit-story"].sort()
    );
  });

  it("jede Komponente liegt in genau einer Kategorie (kein Drift)", () => {
    const categorized = Object.values(puckConfig.categories ?? {}).flatMap(
      (c) => (c.components ?? []) as string[]
    );
    // Keine Duplikate
    expect(new Set(categorized).size).toBe(categorized.length);
    // Jede registrierte Komponente ist genau einmal kategorisiert
    for (const name of EXPECTED) {
      expect(categorized).toContain(name);
    }
    // Keine Kategorie verweist auf eine unbekannte Komponente
    for (const name of categorized) {
      expect(puckConfig.components[name]).toBeTruthy();
    }
  });
});
