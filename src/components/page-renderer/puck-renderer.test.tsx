// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PuckRenderer from "./puck-renderer";
import type { PageContentPuck } from "@/lib/page-builder/schema";

// Embeds (teils async Server-/DB-Komponenten) mocken → DB-/Runtime-frei rendern.
vi.mock("@/components/courses/courses-block", () => ({
  default: () => <div data-testid="courses" />,
}));
vi.mock("@/components/courses/current-appointments-block", () => ({
  default: () => <div data-testid="current-appointments" />,
}));
vi.mock("@/components/stories/herzzeit-story-block", () => ({
  default: () => <div data-testid="herzzeit-story" />,
}));
vi.mock("./contact-form-block", () => ({
  default: () => <div data-testid="contact-form" />,
}));

function puck(content: unknown[]): PageContentPuck {
  return { version: 3, root: { props: {} }, content } as PageContentPuck;
}

describe("PuckRenderer (V3 Tree-Walker)", () => {
  it("zeigt den Leer-Zustand bei leerem content", () => {
    render(<PuckRenderer data={puck([])} />);
    expect(screen.getByText("Inhalt noch nicht definiert.")).toBeInTheDocument();
  });

  it("rendert RichText-HTML", () => {
    render(
      <PuckRenderer
        data={puck([{ type: "RichText", props: { id: "r1", html: "<p>Hallo Welt</p>" } }])}
      />
    );
    expect(screen.getByText("Hallo Welt")).toBeInTheDocument();
  });

  it("mappt die vier Embed-Typen auf ihre Komponenten", () => {
    render(
      <PuckRenderer
        data={puck([
          { type: "Courses", props: { id: "c" } },
          { type: "CurrentAppointments", props: { id: "a" } },
          { type: "HerzZeitStory", props: { id: "h" } },
          { type: "ContactForm", props: { id: "k" } },
        ])}
      />
    );
    expect(screen.getByTestId("courses")).toBeInTheDocument();
    expect(screen.getByTestId("current-appointments")).toBeInTheDocument();
    expect(screen.getByTestId("herzzeit-story")).toBeInTheDocument();
    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });

  it("rendert Section-Slot-Kinder rekursiv", () => {
    render(
      <PuckRenderer
        data={puck([
          {
            type: "Section",
            props: {
              id: "s1",
              children: [
                { type: "RichText", props: { id: "r2", html: "<p>Tief verschachtelt</p>" } },
              ],
            },
          },
        ])}
      />
    );
    expect(screen.getByText("Tief verschachtelt")).toBeInTheDocument();
  });

  it("umhüllt Blöcke mit Responsive-Sichtbarkeitsklassen", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          { type: "RichText", props: { id: "r", html: "<p>x</p>", hideMobile: true } },
        ])}
      />
    );
    expect(container.querySelector(".fhz-hide-mobile")).not.toBeNull();
  });

  it("rendert Columns mit Slot-Inhalten (2 Spalten)", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          {
            type: "Columns",
            props: {
              id: "cols",
              count: 2,
              col1: [{ type: "RichText", props: { id: "a", html: "<p>Links</p>" } }],
              col2: [{ type: "RichText", props: { id: "b", html: "<p>Rechts</p>" } }],
            },
          },
        ])}
      />
    );
    expect(container.querySelector(".fhz-columns")).not.toBeNull();
    expect(screen.getByText("Links")).toBeInTheDocument();
    expect(screen.getByText("Rechts")).toBeInTheDocument();
  });

  it("rendert Spacer, Button und Video", () => {
    render(
      <PuckRenderer
        data={puck([
          { type: "Spacer", props: { id: "s", size: "lg" } },
          { type: "Button", props: { id: "btn", text: "Los", href: "/x", variant: "primary" } },
          { type: "Video", props: { id: "v", src: "/film.mp4", title: "Clip" } },
        ])}
      />
    );
    const link = screen.getByText("Los");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/x");
    expect(screen.getByText("Clip")).toBeInTheDocument();
  });

  it("zeigt den Unknown-Fallback für unbekannte Typen", () => {
    render(<PuckRenderer data={puck([{ type: "GibtsNicht", props: { id: "x" } }])} />);
    expect(screen.getByText(/Unbekannter Block-Typ/)).toBeInTheDocument();
    expect(screen.getByText(/GibtsNicht/)).toBeInTheDocument();
  });
});
