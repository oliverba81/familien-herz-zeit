"use client";

import { useState, memo, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { PageContentV1 } from "@/lib/page-builder/schema";
import { Block } from "@/lib/page-builder/types";
import { getBlockRegistryEntry } from "@/lib/page-builder/registry";
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown, Clipboard, ClipboardPaste } from "lucide-react";

interface CanvasProps {
  content: PageContentV1;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlockById: (blockId: string, direction: "up" | "down") => void;
  onCopyBlock: (blockId: string) => void;
  onPasteBlock: (index: number) => void;
}

export default function Canvas({
  content,
  selectedBlockId,
  onSelectBlock,
  onRemoveBlock,
  onMoveBlock,
  onDuplicateBlock,
  onMoveBlockById,
  onCopyBlock,
  onPasteBlock,
}: CanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null);

  // Verhindere Hydration-Mismatch durch Client-Only Rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Während SSR, zeige leeren Container (verhindert Hydration-Mismatch)
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center text-gray-500 py-8">Lade...</div>
      </div>
    );
  }

  const blockIds = content.blocks.map((b) => b.id);
  const dropTargetIds = Array.from({ length: content.blocks.length + 1 }, (_, i) => `drop-${i}`);

  if (content.blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="text-gray-500">
          <p className="text-lg mb-2">Keine Blocks vorhanden</p>
          <p className="text-sm">Fügen Sie einen Block aus der Bibliothek hinzu</p>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    onSelectBlock(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setHoveredDropIndex(null);
      return;
    }

    const overId = over.id as string;
    if (overId.startsWith("drop-")) {
      const index = parseInt(overId.replace("drop-", ""), 10);
      setHoveredDropIndex(index);
    } else {
      setHoveredDropIndex(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setHoveredDropIndex(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Wenn über Drop-Zone gedroppt wurde
    if (overId.startsWith("drop-")) {
      const targetDropIndex = parseInt(overId.replace("drop-", ""), 10);
      const activeIndex = content.blocks.findIndex((b) => b.id === activeId);

      if (activeIndex === -1) return;

      // Berechne neue Position
      // targetDropIndex ist die Drop-Zone (0 = vor erstem Block, 1 = nach erstem Block, etc.)
      // Wenn wir auf drop-N ziehen, wollen wir den Block bei Index N einfügen
      let newIndex = targetDropIndex;
      
      // Wenn der Block vor der Zielposition ist, müssen wir -1 nehmen,
      // weil der Block noch in der Liste ist und die Indizes sich verschieben
      if (activeIndex < targetDropIndex) {
        newIndex = targetDropIndex - 1;
      }

      // Clamp newIndex auf gültigen Bereich
      newIndex = Math.max(0, Math.min(newIndex, content.blocks.length - 1));

      // Nur verschieben, wenn sich die Position ändert
      if (activeIndex !== newIndex) {
        onMoveBlock(activeIndex, newIndex);
      }
      return;
    }

    // Fallback: Sortable Reorder
    if (activeId !== overId) {
      const oldIndex = content.blocks.findIndex((b) => b.id === activeId);
      const newIndex = content.blocks.findIndex((b) => b.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveBlock(oldIndex, newIndex);
      }
    }
  };

  const activeBlock = activeId ? content.blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-4xl mx-auto space-y-0 relative">
        {content.blocks.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Seite ist leer
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Füge links einen Block hinzu oder wähle ein Template aus der Bibliothek.
              </p>
              <div className="text-xs text-gray-500">
                Tipp: Nutze die Tabs in der Block-Bibliothek für Templates und wiederverwendbare Blöcke.
              </div>
            </div>
          </div>
        ) : (
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            {content.blocks.map((block, index) => (
            <div key={block.id} className="relative">
              {/* Drop Line vor Block */}
              <DropLine
                id={`drop-${index}`}
                isHovered={hoveredDropIndex === index}
              />
              <SortableBlockItem
                block={block}
                isSelected={selectedBlockId === block.id}
                isDragging={activeId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onRemove={() => onRemoveBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onCopy={onCopyBlock ? () => onCopyBlock(block.id) : undefined}
                onMoveUp={
                  index > 0
                    ? () => onMoveBlockById(block.id, "up")
                    : undefined
                }
                onMoveDown={
                  index < content.blocks.length - 1
                    ? () => onMoveBlockById(block.id, "down")
                    : undefined
                }
              />
            </div>
          ))}
          </SortableContext>
        )}
        {/* Drop Line nach letztem Block */}
        {content.blocks.length > 0 && (
          <DropLine
            id={`drop-${content.blocks.length}`}
            isHovered={hoveredDropIndex === content.blocks.length}
          />
        )}
      </div>

      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-50">
            <BlockPreview block={activeBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface DropLineProps {
  id: string;
  isHovered: boolean;
}

function DropLine({ id, isHovered }: DropLineProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-2 -my-1 transition-all ${
        isHovered || isOver
          ? "bg-rose-500 opacity-100"
          : "bg-transparent opacity-0 hover:opacity-30 hover:bg-gray-300"
      }`}
      style={{
        marginLeft: "-1rem",
        marginRight: "-1rem",
      }}
    />
  );
}

interface SortableBlockItemProps {
  block: Block;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onCopy?: () => void;
}

const SortableBlockItem = memo(function SortableBlockItem({
  block,
  isSelected,
  isDragging,
  onSelect,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onCopy,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const entry = getBlockRegistryEntry(block.type);
  const CanvasComponent = entry.CanvasComponent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group mb-4 ${
        isSelected
          ? "ring-2 ring-rose-500 ring-offset-2 rounded-lg"
          : "hover:ring-2 hover:ring-gray-300 rounded-lg"
      } ${isDragging ? "z-50" : ""}`}
    >
      {/* Block Controls Toolbar */}
      <div
        className={`absolute -top-2 left-0 right-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
          isSelected ? "opacity-100" : ""
        }`}
      >
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1">
          <span className="text-xs text-gray-600">{entry.icon}</span>
          <span className="text-xs font-medium text-gray-700">{entry.label}</span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
            title="Verschieben"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {/* Copy Button */}
          {onCopy && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopy();
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              title="In Zwischenablage kopieren (Ctrl+C)"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          )}
          {/* Duplicate Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate();
            }}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            title="Duplizieren"
          >
            <Copy className="w-4 h-4" />
          </button>
          {/* Move Up */}
          {onMoveUp && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveUp();
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              title="Nach oben"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {/* Move Down */}
          {onMoveDown && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveDown();
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              title="Nach unten"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Block wirklich löschen?")) {
                onRemove();
              }
            }}
            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            title="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div onClick={onSelect} className="cursor-pointer">
        <CanvasComponent block={block} />
      </div>
    </div>
  );
});

const BlockPreview = memo(function BlockPreview({ block }: { block: Block }) {
  try {
    const entry = getBlockRegistryEntry(block.type);
    const CanvasComponent = entry.CanvasComponent;
    return (
      <div className="bg-white rounded-lg border-2 border-rose-500 p-4 shadow-lg">
        <CanvasComponent block={block} />
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded">
        <p className="text-sm text-gray-600">Block: {block.type}</p>
      </div>
    );
  }
});
