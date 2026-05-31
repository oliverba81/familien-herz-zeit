"use client";

import { ValidationError } from "@/lib/page-builder/validate";
import { AlertTriangle, X, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  onSelectBlock?: (blockId: string) => void;
  onClose?: () => void;
}

export default function ValidationPanel({
  errors,
  warnings,
  onSelectBlock,
  onClose,
}: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSection, setExpandedSection] = useState<"errors" | "warnings" | null>("errors");

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const handleBlockClick = (blockId?: string) => {
    if (blockId && onSelectBlock) {
      onSelectBlock(blockId);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Validierung
            {errors.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                {errors.length} Fehler
              </span>
            )}
            {warnings.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                {warnings.length} Warnungen
              </span>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {expanded && (
          <div className="space-y-3">
            {errors.length > 0 && (
              <div>
                <button
                  onClick={() =>
                    setExpandedSection(expandedSection === "errors" ? null : "errors")
                  }
                  className="flex items-center gap-2 w-full text-left text-sm font-medium text-red-700 mb-2"
                >
                  {expandedSection === "errors" ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <AlertTriangle className="w-4 h-4" />
                  Fehler ({errors.length})
                </button>
                {expandedSection === "errors" && (
                  <div className="ml-6 space-y-2">
                    {errors.map((error, index) => (
                      <div
                        key={index}
                        className="p-2 bg-red-50 border border-red-200 rounded text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-red-900">{error.path}</div>
                            <div className="text-red-700 mt-1">{error.message}</div>
                          </div>
                          {error.blockId && onSelectBlock && (
                            <button
                              onClick={() => handleBlockClick(error.blockId)}
                              className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Block wählen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {warnings.length > 0 && (
              <div>
                <button
                  onClick={() =>
                    setExpandedSection(expandedSection === "warnings" ? null : "warnings")
                  }
                  className="flex items-center gap-2 w-full text-left text-sm font-medium text-yellow-700 mb-2"
                >
                  {expandedSection === "warnings" ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <AlertTriangle className="w-4 h-4" />
                  Warnungen ({warnings.length})
                </button>
                {expandedSection === "warnings" && (
                  <div className="ml-6 space-y-2">
                    {warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-yellow-900">{warning.path}</div>
                            <div className="text-yellow-700 mt-1">{warning.message}</div>
                          </div>
                          {warning.blockId && onSelectBlock && (
                            <button
                              onClick={() => handleBlockClick(warning.blockId)}
                              className="ml-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
                            >
                              Block wählen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



