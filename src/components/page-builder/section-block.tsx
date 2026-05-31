"use client";

import { Block } from "@/lib/page-builder/types";
import PageRenderer from "@/components/page-renderer/page-renderer";
import { PageContentV1 } from "@/lib/page-builder/schema";

interface SectionBlockProps {
  block: Block;
}

export function SectionCanvasComponent({ block }: SectionBlockProps) {
  const data = block.data as { title?: string; layout?: string; background?: string; padding?: string; children?: Block[] };
  const children = data.children || [];

  const layoutClass = data.layout === "narrow" ? "max-w-4xl mx-auto" : "";
  const backgroundClass = data.background === "soft" ? "bg-gray-50" : "";
  const paddingClass = {
    sm: "py-4",
    md: "py-8",
    lg: "py-12",
  }[data.padding || "md"] || "py-8";

  return (
    <div className={`${backgroundClass} ${paddingClass} rounded-lg border-2 border-dashed border-gray-300`}>
      <div className={layoutClass}>
        {data.title && (
          <h3 className="text-lg font-semibold text-gray-700 mb-4 px-4">
            Section: {data.title}
          </h3>
        )}
        {children.length > 0 ? (
          <div className="space-y-4 px-4">
            <PageRenderer
              content={{
                version: 1,
                blocks: children,
              }}
            />
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8 px-4">
            <p className="text-sm">Leere Section - füge Blocks hinzu</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionInspectorComponent({
  block,
  onChange,
}: {
  block: Block;
  onChange: (block: Block) => void;
}) {
  const data = block.data as {
    title?: string;
    layout?: string;
    background?: string;
    padding?: string;
    children?: Block[];
  };

  const updateData = (updates: Partial<typeof data>) => {
    onChange({
      ...block,
      data: {
        ...data,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Section Block</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titel (optional)
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => updateData({ title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="Section Titel"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Layout
        </label>
        <select
          value={data.layout || "default"}
          onChange={(e) => updateData({ layout: e.target.value as "default" | "narrow" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
        >
          <option value="default">Standard</option>
          <option value="narrow">Schmal</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hintergrund
        </label>
        <select
          value={data.background || "none"}
          onChange={(e) => updateData({ background: e.target.value as "none" | "soft" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
        >
          <option value="none">Keiner</option>
          <option value="soft">Weich (grau)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Padding
        </label>
        <select
          value={data.padding || "md"}
          onChange={(e) => updateData({ padding: e.target.value as "sm" | "md" | "lg" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
        >
          <option value="sm">Klein</option>
          <option value="md">Mittel</option>
          <option value="lg">Groß</option>
        </select>
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {data.children?.length || 0} Block(s) in dieser Section
        </p>
      </div>
    </div>
  );
}



