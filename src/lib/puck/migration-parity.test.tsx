// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { contentToPuck } from "./to-puck-data";
import PuckRenderer from "@/components/page-renderer/puck-renderer";

// Embeds DB-/Runtime-frei rendern.
vi.mock("@/components/courses/courses-block", () => ({ default: () => <div data-testid="courses" /> }));
vi.mock("@/components/courses/current-appointments-block", () => ({
  default: () => <div data-testid="appointments" />,
}));
vi.mock("@/components/stories/herzzeit-story-block", () => ({
  default: () => <div data-testid="story" />,
}));
vi.mock("@/components/page-renderer/contact-form-block", () => ({
  default: () => <div data-testid="contact" />,
}));

/**
 * End-to-End-Parität: bestehender Inhalt (V1/V2) → contentToPuck → renderPuckTree.
 * Stellt sicher, dass beim Umstieg auf Puck keine Texte verloren gehen.
 */
describe("Migrations-Parität (Inhalt → Puck → Render)", () => {
  it("V2-HTML behält allen sichtbaren Text", () => {
    const html = "<h1>Babykurse</h1><p>Entspannt lernen.</p><h2>Termine</h2>";
    const puck = contentToPuck({ version: 2, html });
    render(<PuckRenderer data={puck} />);
    expect(screen.getByText("Babykurse")).toBeInTheDocument();
    expect(screen.getByText("Entspannt lernen.")).toBeInTheDocument();
    expect(screen.getByText("Termine")).toBeInTheDocument();
  });

  it("V2 mit Embed: Text + Embed-Komponente erscheinen", () => {
    const html =
      '<p>Vor dem Kurs</p><div data-fhz-block="courses" data-fhz-block-id="c1">📅</div><p>Nach dem Kurs</p>';
    const puck = contentToPuck({ version: 2, html });
    render(<PuckRenderer data={puck} />);
    expect(screen.getByText("Vor dem Kurs")).toBeInTheDocument();
    expect(screen.getByText("Nach dem Kurs")).toBeInTheDocument();
    expect(screen.getByTestId("courses")).toBeInTheDocument();
  });

  it("V1-Blocks behalten Überschrift + Text", () => {
    // richText/text statt hero (hero erzeugt linear-gradient, das jsdom-CSS nicht parst).
    const v1 = {
      version: 1,
      blocks: [
        { id: "1", type: "richText", data: { html: "<h2>Willkommen</h2>" } },
        { id: "2", type: "text", data: { text: "Ein schöner Absatz." } },
      ],
    };
    const puck = contentToPuck(v1);
    render(<PuckRenderer data={puck} />);
    expect(screen.getByText("Willkommen")).toBeInTheDocument();
    expect(screen.getByText(/Ein schöner Absatz/)).toBeInTheDocument();
  });
});
