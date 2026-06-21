// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Schwergewichtige Kind-Komponenten stubben, damit der Editor DB-/Browser-frei rendert.
vi.mock("@/components/page-builder/tinymce-block-editor", () => ({
  default: () => <div data-testid="tinymce-stub" />,
}));
vi.mock("@/components/media/media-picker-modal", () => ({
  default: () => null,
}));

import BlockEditor from "./block-editor";
import type { Block } from "@/lib/page-builder/types";

function storyBlock(stories: unknown[] = []): Block {
  return { id: "blk1", type: "herzzeit-story", data: { stories } } as unknown as Block;
}

describe("BlockEditor → HerzZeitStoryEditor (Welle 3: Hooks vor early-return)", () => {
  it("rendert den Story-Editor mit gültigem Block ohne Crash", () => {
    render(<BlockEditor block={storyBlock([])} onChange={vi.fn()} />);
    expect(screen.getByText("HerzZeit-Geschichten Block")).toBeInTheDocument();
    expect(screen.getByText("Globale Einstellungen")).toBeInTheDocument();
  });

  it("ruft onChange beim Hinzufügen einer Geschichte auf (Hooks/Callbacks intakt)", () => {
    const onChange = vi.fn();
    render(<BlockEditor block={storyBlock([])} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Geschichte/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as { data: { stories: unknown[] } };
    expect(updated.data.stories).toHaveLength(1);
  });

  it("rendert auch mit vorhandener Geschichte (deren Felder erscheinen)", () => {
    const block = storyBlock([
      {
        id: "a",
        title: "Meine Geschichte",
        teaser: "Teaser",
        readingTime: "",
        audioUrl: "",
        imageUrl: "",
        fullText: "<p></p>",
      },
    ]);
    render(<BlockEditor block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Meine Geschichte")).toBeInTheDocument();
  });
});
