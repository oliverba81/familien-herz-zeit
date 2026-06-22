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

  it("rendert Heading, Divider, Features und Testimonials", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          { type: "Heading", props: { id: "h", text: "Titel", level: 3, align: "center" } },
          { type: "Divider", props: { id: "d" } },
          {
            type: "Features",
            props: { id: "f", title: "Vorteile", items: [{ title: "Schnell", text: "sehr" }] },
          },
          {
            type: "Testimonials",
            props: { id: "t", items: [{ name: "Anna", text: "Toll!" }] },
          },
        ])}
      />
    );
    expect(container.querySelector("h3")?.textContent).toBe("Titel");
    expect(container.querySelector("hr")).not.toBeNull();
    expect(screen.getByText("Vorteile")).toBeInTheDocument();
    expect(screen.getByText("Schnell")).toBeInTheDocument();
    expect(screen.getByText("Toll!")).toBeInTheDocument();
    expect(screen.getByText("— Anna")).toBeInTheDocument();
  });

  it("wendet Section-Gestaltung an (Hintergrund + maxWidth)", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          {
            type: "Section",
            props: {
              id: "s",
              background: "#f9fafb",
              padding: "lg",
              maxWidth: "narrow",
              children: [{ type: "RichText", props: { id: "r", html: "<p>Drin</p>" } }],
            },
          },
        ])}
      />
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.style.backgroundColor).toBeTruthy();
    expect(container.querySelector(".max-w-2xl")).not.toBeNull();
    expect(screen.getByText("Drin")).toBeInTheDocument();
  });

  it("rendert Bild mit Verlinkung, Anker-Sektion, Embed, Akkordeon, Tabs und Galerie", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          {
            type: "Section",
            props: { id: "s", anchorId: "kontakt", children: [] },
          },
          {
            type: "Image",
            props: { id: "img", src: "/foto.jpg", alt: "Foto", href: "/ziel", newTab: true },
          },
          { type: "Embed", props: { id: "e", url: "https://youtu.be/dQw4w9WgXcQ" } },
          {
            type: "Accordion",
            props: { id: "acc", items: [{ question: "Wie?", answer: "So." }] },
          },
          {
            type: "Tabs",
            props: { id: "tab", items: [{ label: "Eins", content: "Inhalt eins" }] },
          },
          {
            type: "Gallery",
            props: { id: "g", columns: 2, items: [{ src: "/a.jpg", alt: "A" }] },
          },
        ])}
      />
    );
    // Anker-ID auf der Sektion
    expect(container.querySelector("section#kontakt")).not.toBeNull();
    // Bild verlinkt mit neuem Tab
    const link = container.querySelector('a[href="/ziel"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.target).toBe("_blank");
    expect(container.querySelector('img[alt="Foto"]')).not.toBeNull();
    // Embed → YouTube-iframe
    expect(container.querySelector('iframe[src*="youtube.com/embed/dQw4w9WgXcQ"]')).not.toBeNull();
    // Akkordeon → <details>
    expect(container.querySelector("details")).not.toBeNull();
    expect(screen.getByText("Wie?")).toBeInTheDocument();
    // Tabs → Reiter-Button
    expect(screen.getByRole("tab", { name: "Eins" })).toBeInTheDocument();
    // Galerie → Bild
    expect(container.querySelector('img[alt="A"]')).not.toBeNull();
  });

  it("rendert die Galerie als Slider (layout=slider)", () => {
    const { container } = render(
      <PuckRenderer
        data={puck([
          {
            type: "Gallery",
            props: { id: "g", columns: 3, layout: "slider", items: [{ src: "/a.jpg", alt: "A" }] },
          },
        ])}
      />
    );
    expect(container.querySelector(".fhz-gallery--slider")).not.toBeNull();
    expect(container.querySelector(".fhz-gallery__img")).not.toBeNull();
  });

  it("zeigt den Unknown-Fallback für unbekannte Typen", () => {
    render(<PuckRenderer data={puck([{ type: "GibtsNicht", props: { id: "x" } }])} />);
    expect(screen.getByText(/Unbekannter Block-Typ/)).toBeInTheDocument();
    expect(screen.getByText(/GibtsNicht/)).toBeInTheDocument();
  });
});
