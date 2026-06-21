// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Schwergewichtige Browser-/Kind-Abhängigkeiten stubben.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tinymce/tinymce-react", () => ({
  Editor: () => <div data-testid="tinymce-editor" />,
}));
vi.mock("@/components/media/media-picker-modal", () => ({ default: () => null }));
vi.mock("@/components/page-builder/block-editor", () => ({ default: () => null }));

import PageBuilderV2Shell from "./page-builder-v2-shell";

const initialContentJson = { version: 2, html: "<p>Hallo</p>" };

describe("PageBuilderV2Shell (Welle 2: ref-Zugriff in Effect)", () => {
  it("rendert mit onChange-Prop ohne Crash", () => {
    render(
      <PageBuilderV2Shell
        pageId="p1"
        initialContentJson={initialContentJson}
        onSave={vi.fn(async () => {})}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("WYSIWYG-Builder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Schließen/ })).toBeInTheDocument();
  });

  it("rendert auch OHNE onChange-Prop (onChangeRef.current?.() bleibt no-op)", () => {
    render(
      <PageBuilderV2Shell
        pageId="p1"
        initialContentJson={initialContentJson}
        onSave={vi.fn(async () => {})}
      />
    );
    // Kein Crash trotz fehlendem onChange — der Ref-Zugriff ist optional-chained.
    expect(screen.getByText("WYSIWYG-Builder")).toBeInTheDocument();
  });
});
