// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PageRenderer from "./page-renderer";
import type { PageContentV1 } from "@/lib/page-builder/schema";

// Schwergewichtige/Client-Kind-Komponenten und next/image mocken, damit der
// Renderer DB-/Runtime-frei rendert.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt={(props.alt as string) || ""} />,
}));
vi.mock("@/components/stories/herzzeit-story-block", () => ({
  default: () => <div data-testid="herzzeit-story" />,
}));
vi.mock("./contact-form-block", () => ({
  default: () => <div data-testid="contact-form" />,
}));

function content(blocks: unknown[]): PageContentV1 {
  return { version: 1, blocks } as unknown as PageContentV1;
}

describe("PageRenderer (Block-Rendering + Fallbacks)", () => {
  it("zeigt den Leer-Zustand bei fehlenden Blöcken", () => {
    render(<PageRenderer content={content([])} />);
    expect(screen.getByText("Inhalt noch nicht definiert.")).toBeInTheDocument();
  });

  it("rendert bekannte Block-Typen mit ihrem Inhalt", () => {
    const c = content([
      { id: "1", type: "hero", data: { heading: "Willkommen", subheading: "Untertitel" } },
      { id: "2", type: "text", data: { text: "Ein Absatz." } },
      { id: "3", type: "cta", data: { heading: "Los geht's", buttonLabel: "Start", buttonHref: "/x" } },
      { id: "4", type: "features", data: { items: [{ title: "F1", text: "T1" }] } },
    ]);
    render(<PageRenderer content={c} />);
    expect(screen.getByText("Willkommen")).toBeInTheDocument();
    expect(screen.getByText("Untertitel")).toBeInTheDocument();
    expect(screen.getByText("Ein Absatz.")).toBeInTheDocument();
    expect(screen.getByText("Los geht's")).toBeInTheDocument();
    expect(screen.getByText("F1")).toBeInTheDocument();
  });

  it("zeigt den Unknown-Fallback für unbekannte Block-Typen", () => {
    const c = content([{ id: "9", type: "voellig-unbekannt", data: {} }]);
    render(<PageRenderer content={c} />);
    expect(screen.getByText(/Unbekannter Block-Typ/)).toBeInTheDocument();
    expect(screen.getByText(/voellig-unbekannt/)).toBeInTheDocument();
  });

  it("rendert mehrere Blöcke in Reihenfolge ohne Crash", () => {
    const c = content([
      { id: "1", type: "spacer", data: { size: "md" } },
      { id: "2", type: "herzzeit-story", data: {} },
      { id: "3", type: "contactForm", data: {} },
    ]);
    render(<PageRenderer content={c} />);
    expect(screen.getByTestId("herzzeit-story")).toBeInTheDocument();
    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });
});
