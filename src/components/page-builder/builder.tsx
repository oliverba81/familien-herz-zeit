"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as React from "react";
import { PageContent, Block } from "@/lib/page-builder/types";
import { createBlock, generateBlockId, normalizeContent } from "@/lib/page-builder/templates";
import BlockList from "./block-list";
import BlockEditor from "./block-editor";
import AddBlockMenu from "./add-block-menu";
import PageRenderer from "@/components/page-renderer/page-renderer";
import AdvancedJSON from "./advanced-json";

interface BuilderProps {
  value: PageContent;
  onChange: (content: PageContent) => void;
}

type ViewMode = "builder" | "json";

export default function Builder({ value, onChange }: BuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    value.blocks[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("builder");
  const [jsonError, setJsonError] = useState("");

  // Synchronisiere selectedBlockId nur wenn Block gelöscht wurde (Länge hat sich verringert)
  const prevBlocksLengthRef = useRef(value.blocks.length);
  useEffect(() => {
    const currentLength = value.blocks.length;
    const prevLength = prevBlocksLengthRef.current;
    
    // Nur reagieren wenn Länge sich verringert hat (Block wurde gelöscht)
    if (currentLength < prevLength && selectedBlockId) {
      const blockExists = value.blocks.some((b) => b.id === selectedBlockId);
      if (!blockExists) {
        // Block wurde gelöscht, wähle ersten verfügbaren Block
        if (value.blocks.length > 0) {
          setSelectedBlockId(value.blocks[0].id);
        } else {
          setSelectedBlockId(null);
        }
      }
    }
    
    // Initial: Wenn kein Block ausgewählt, aber Blocks vorhanden
    if (!selectedBlockId && value.blocks.length > 0) {
      setSelectedBlockId(value.blocks[0].id);
    }
    
    prevBlocksLengthRef.current = currentLength;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.blocks.length]); // Nur auf Längenänderung reagieren

  const selectedBlock = value.blocks.find((b) => b.id === selectedBlockId) || null;

  const updateBlock = useCallback(
    (updatedBlock: Block) => {
      onChange({
        ...value,
        blocks: value.blocks.map((b) =>
          b.id === updatedBlock.id ? updatedBlock : b
        ),
      });
    },
    [value, onChange]
  );

  const addBlock = useCallback(
    (block: Block) => {
      const newContent = {
        ...value,
        blocks: [...value.blocks, block],
      };
      onChange(newContent);
      // Setze selectedBlockId sofort
      setSelectedBlockId(block.id);
    },
    [value, onChange]
  );

  const moveBlock = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= value.blocks.length) return;

      const newBlocks = [...value.blocks];
      const movedBlockId = newBlocks[fromIndex].id;
      [newBlocks[fromIndex], newBlocks[toIndex]] = [
        newBlocks[toIndex],
        newBlocks[fromIndex],
      ];

      onChange({
        ...value,
        blocks: newBlocks,
      });

      // Stelle sicher, dass der verschobene Block weiterhin ausgewählt ist
      if (selectedBlockId === movedBlockId) {
        setSelectedBlockId(movedBlockId);
      }
    },
    [value, onChange, selectedBlockId]
  );

  const duplicateBlock = useCallback(
    (block: Block) => {
      const newBlock: Block = {
        ...block,
        id: generateBlockId(),
      };
      const index = value.blocks.findIndex((b) => b.id === block.id);
      const newBlocks = [...value.blocks];
      newBlocks.splice(index + 1, 0, newBlock);

      onChange({
        ...value,
        blocks: newBlocks,
      });
      setSelectedBlockId(newBlock.id);
    },
    [value, onChange]
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      const newBlocks = value.blocks.filter((b) => b.id !== blockId);
      onChange({
        ...value,
        blocks: newBlocks,
      });

      if (selectedBlockId === blockId) {
        setSelectedBlockId(newBlocks[0]?.id || null);
      }
    },
    [value, onChange, selectedBlockId]
  );

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setViewMode("builder")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            viewMode === "builder"
              ? "border-b-2 border-rose-500 text-rose-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Builder
        </button>
        <button
          type="button"
          onClick={() => setViewMode("json")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            viewMode === "json"
              ? "border-b-2 border-rose-500 text-rose-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Advanced JSON
        </button>
      </div>

      {viewMode === "builder" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Block Management */}
          <div className="space-y-4">
            <AddBlockMenu onAdd={addBlock} />
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Blocks</h3>
              <BlockList
                blocks={value.blocks}
                selectedBlockId={selectedBlockId}
                onSelect={setSelectedBlockId}
                onMoveUp={(index) => moveBlock(index, "up")}
                onMoveDown={(index) => moveBlock(index, "down")}
                onDuplicate={duplicateBlock}
                onDelete={deleteBlock}
              />
            </div>
            {selectedBlock && (
              <div className="border-t pt-4">
                <BlockEditor block={selectedBlock} onChange={updateBlock} />
              </div>
            )}
          </div>

          {/* Right: Live Preview */}
          <div className="lg:sticky lg:top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 sticky top-0 bg-white z-10 pb-2">
                Live Preview
              </h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <PageRenderer content={normalizeContent(value)} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AdvancedJSON
          value={value}
          onChange={onChange}
          onError={setJsonError}
        />
      )}

      {jsonError && viewMode === "builder" && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠️ JSON-Fehler: {jsonError}
        </div>
      )}
    </div>
  );
}

