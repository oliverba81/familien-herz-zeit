"use client";

import { useState, useEffect, useRef } from "react";
import { BlockType, Block } from "@/lib/page-builder/types";
import { getAllBlockTypes, getBlockRegistryEntry } from "@/lib/page-builder/registry";
import { getAllTemplates } from "@/lib/page-builder/block-templates";
import { ClipboardPaste } from "lucide-react";

interface BlockLibraryProps {
  onAddBlock: (type: BlockType) => void;
  onAddTemplate?: (templateId: string) => void;
  onAddReusable?: (reusableId: string) => void;
  onPasteBlock?: (block: Block) => void;
}

export default function BlockLibrary({
  onAddBlock,
  onAddTemplate,
  onAddReusable,
  onPasteBlock,
}: BlockLibraryProps) {
  const blockTypes = getAllBlockTypes();
  const templates = getAllTemplates();
  const [reusableBlocks, setReusableBlocks] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [activeTab, setActiveTab] = useState<"blocks" | "templates" | "reusable">("blocks");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onAddReusable) {
      fetch("/api/reusable-blocks")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setReusableBlocks(data);
          }
        })
        .catch((err) => console.error("Error loading reusable blocks:", err));
    }
  }, [onAddReusable]);

  const handleImportBlock = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPasteBlock) return;

    try {
      const text = await file.text();
      const block = JSON.parse(text);
      if (block && block.type && block.data) {
        onPasteBlock(block);
      } else {
        alert("Ungültige Block-Datei. Die Datei muss ein gültiges Block-JSON enthalten.");
      }
    } catch (error) {
      alert("Fehler beim Lesen der Datei. Bitte stelle sicher, dass es sich um eine gültige JSON-Datei handelt.");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!onPasteBlock) return;
    try {
      const text = await navigator.clipboard.readText();
      const block = JSON.parse(text);
      if (block && block.type && block.data) {
        onPasteBlock(block);
      } else {
        alert("Kein gültiger Block in der Zwischenablage gefunden.");
      }
    } catch (error) {
      alert("Fehler beim Einfügen. Bitte stelle sicher, dass ein gültiger Block in der Zwischenablage ist.");
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Block-Bibliothek</h3>

      {/* Import Buttons */}
      {onPasteBlock && (
        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePasteFromClipboard();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors"
            title="Block aus Zwischenablage einfügen (Ctrl+V)"
          >
            <ClipboardPaste className="w-4 h-4" />
            Aus Zwischenablage einfügen
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleImportBlock();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Block aus Datei importieren
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab("blocks");
          }}
          className={`px-3 py-2 text-xs font-medium ${
            activeTab === "blocks"
              ? "text-rose-600 border-b-2 border-rose-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Blöcke
        </button>
        {onAddTemplate && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab("templates");
            }}
            className={`px-3 py-2 text-xs font-medium ${
              activeTab === "templates"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Templates
          </button>
        )}
        {onAddReusable && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab("reusable");
            }}
            className={`px-3 py-2 text-xs font-medium ${
              activeTab === "reusable"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Reusable
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "blocks" && (
        <div className="space-y-2">
          {blockTypes
            .filter((type) => type !== "section" && type !== "reusable")
            .map((type) => {
              const entry = getBlockRegistryEntry(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddBlock(type);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-rose-300 transition-colors text-left"
                >
                  <span className="text-xl">{entry.icon}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {entry.label}
                  </span>
                </button>
              );
            })}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddBlock("section");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-rose-300 transition-colors text-left"
          >
            <span className="text-xl">📦</span>
            <span className="text-sm font-medium text-gray-700">Section</span>
          </button>
        </div>
      )}

      {activeTab === "templates" && onAddTemplate && (
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddTemplate(template.id);
              }}
              className="w-full flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-rose-300 transition-colors text-left"
            >
              <span className="text-xl">{template.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">
                  {template.label}
                </div>
                {template.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {template.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === "reusable" && onAddReusable && (
        <div className="space-y-2">
          {reusableBlocks.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Noch keine Reusable Blocks vorhanden
            </p>
          ) : (
            reusableBlocks.map((rb) => (
              <button
                key={rb.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddReusable(rb.id);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-rose-300 transition-colors text-left"
              >
                <span className="text-xl">🔄</span>
                <span className="text-sm font-medium text-gray-700">
                  {rb.name}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

