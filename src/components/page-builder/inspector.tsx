"use client";

import { PageContentV1 } from "@/lib/page-builder/schema";
import { Block } from "@/lib/page-builder/types";
import { getBlockRegistryEntry } from "@/lib/page-builder/registry";

interface InspectorProps {
  content: PageContentV1;
  selectedBlockId: string | null;
  onUpdateBlock: (blockId: string, data: Partial<Block["data"]>) => void;
}

export default function Inspector({
  content,
  selectedBlockId,
  onUpdateBlock,
}: InspectorProps) {
  const selectedBlock = content.blocks.find(
    (b) => b.id === selectedBlockId
  ) || null;

  if (!selectedBlock) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-xs mx-auto">
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Kein Block ausgewählt
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Klicke einen Block im Canvas an, um ihn zu bearbeiten.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>⌨️ <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Alt</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↓</kbd> bewegt Blocks</div>
            <div>⌨️ <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Z</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Y</kbd> für Undo/Redo</div>
          </div>
        </div>
      </div>
    );
  }

  const entry = getBlockRegistryEntry(selectedBlock.type);
  const InspectorComponent = entry.InspectorComponent;

  const handleChange = (updatedBlock: Block) => {
    onUpdateBlock(updatedBlock.id, updatedBlock.data);
  };

  return (
    <div className="p-4">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">{entry.icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{entry.label}</h3>
        </div>
      </div>
      <InspectorComponent block={selectedBlock} onChange={handleChange} />
    </div>
  );
}

