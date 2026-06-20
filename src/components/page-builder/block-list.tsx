"use client";

import { Block, BlockType } from "@/lib/page-builder/types";

interface BlockListProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (block: Block) => void;
  onDelete: (blockId: string) => void;
}

const blockIcons: Record<BlockType, string> = {
  hero: "🎯",
  text: "📝",
  richText: "📄",
  image: "🖼️",
  video: "🎥",
  features: "⭐",
  testimonials: "💬",
  cta: "🚀",
  spacer: "↕️",
  table: "📊",
  section: "📦",
  reusable: "♻️",
  courses: "📚",
  "current-appointments": "📅",
  "herzzeit-story": "📖",
  contactForm: "📧",
};

const blockLabels: Record<BlockType, string> = {
  hero: "Hero",
  text: "Text",
  richText: "Formatierter Text",
  image: "Bild",
  video: "Video",
  features: "Features",
  testimonials: "Testimonials",
  cta: "Call to Action",
  spacer: "Abstand",
  table: "Tabelle",
  section: "Sektion",
  reusable: "Wiederverwendbar",
  courses: "Kurse",
  "current-appointments": "Aktuelle Termine",
  "herzzeit-story": "HerzZeit-Geschichte",
  contactForm: "Kontaktformular",
};

export default function BlockList({
  blocks,
  selectedBlockId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>Noch keine Blocks vorhanden.</p>
        <p className="text-sm mt-2">Füge einen Block hinzu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const isSelected = selectedBlockId === block.id;
        const title =
          block.type === "hero"
            ? block.data.heading || blockLabels[block.type]
            : block.type === "text"
            ? (block.data.text || blockLabels[block.type]).substring(0, 30) + "..."
            : blockLabels[block.type];

        return (
          <div
            key={block.id}
            data-block-id={block.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? "border-rose-500 bg-rose-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => onSelect(block.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{blockIcons[block.type]}</span>
                <span className="text-sm font-medium text-gray-700">{title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp(index);
                  }}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Nach oben"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown(index);
                  }}
                  disabled={index === blocks.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Nach unten"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(block);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Duplizieren"
                >
                  📋
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Block wirklich löschen?")) {
                      onDelete(block.id);
                    }
                  }}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">{block.type}</div>
          </div>
        );
      })}
    </div>
  );
}

