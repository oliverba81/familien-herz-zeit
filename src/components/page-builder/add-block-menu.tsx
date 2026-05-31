"use client";

import { BlockType } from "@/lib/page-builder/types";
import { createBlock } from "@/lib/page-builder/templates";

interface AddBlockMenuProps {
  onAdd: (block: ReturnType<typeof createBlock>) => void;
}

const blockTypes: { type: BlockType; label: string; icon: string }[] = [
  { type: "hero", label: "Hero", icon: "🎯" },
  { type: "text", label: "Text", icon: "📝" },
  { type: "richText", label: "Formatierter Text", icon: "✏️" },
  { type: "image", label: "Bild", icon: "🖼️" },
  { type: "video", label: "Video", icon: "🎥" },
  { type: "features", label: "Features", icon: "⭐" },
  { type: "testimonials", label: "Testimonials", icon: "💬" },
  { type: "cta", label: "Call to Action", icon: "🚀" },
  { type: "spacer", label: "Abstand", icon: "↕️" },
  { type: "table", label: "Tabelle", icon: "📊" },
  { type: "courses", label: "Kurse & Termine", icon: "📅" },
  { type: "current-appointments", label: "Aktuelle Termine", icon: "🗓️" },
  { type: "herzzeit-story", label: "HerzZeit-Geschichten", icon: "📖" },
];

export default function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Block hinzufügen</h3>
      <div className="grid grid-cols-2 gap-2">
        {blockTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdd(createBlock(type));
            }}
            className="flex items-center gap-2 p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-rose-500 transition-colors text-left"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

