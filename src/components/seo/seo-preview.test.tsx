// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SeoPreview from "./seo-preview";

describe("SeoPreview", () => {
  it("zeigt Titel, Beschreibung und URL", () => {
    render(
      <SeoPreview
        title="Babykurse in Rossau"
        description="Entspannte Kurse für Eltern und Kind."
        slug="kurse"
        ogImageUrl={null}
      />
    );
    expect(screen.getAllByText("Babykurse in Rossau").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Entspannte Kurse/).length).toBeGreaterThan(0);
    expect(screen.getByText(/familien-herz-zeit\.de\/kurse/)).toBeInTheDocument();
  });

  it("kürzt lange Titel mit Ellipse", () => {
    const long = "Sehr langer Seitentitel der definitiv über sechzig Zeichen hinausgeht und gekürzt werden muss";
    render(<SeoPreview title={long} description="x" slug="home" ogImageUrl={null} />);
    const els = screen.getAllByText(/…$/);
    expect(els.length).toBeGreaterThan(0);
  });

  it("zeigt Platzhalter ohne OG-Bild", () => {
    render(<SeoPreview title="T" description="D" slug="home" ogImageUrl={null} />);
    expect(screen.getByText(/Kein OG-Bild/)).toBeInTheDocument();
  });

  it("home-Slug erzeugt keine Pfadangabe", () => {
    render(<SeoPreview title="Start" description="D" slug="home" ogImageUrl={null} />);
    // Domain erscheint in Google-Snippet (ohne /home) und Social-Card.
    expect(screen.getAllByText("familien-herz-zeit.de").length).toBeGreaterThan(0);
    expect(screen.queryByText(/\/home/)).toBeNull();
  });
});
