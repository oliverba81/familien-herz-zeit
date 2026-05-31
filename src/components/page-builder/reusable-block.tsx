"use client";

import { Block } from "@/lib/page-builder/types";

interface ReusableBlockProps {
  block: Block;
  reusableName?: string;
}

export function ReusableCanvasComponent({ block, reusableName }: ReusableBlockProps) {
  const data = block.data as { reusableId: string };

  return (
    <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
      <p className="text-sm font-medium text-blue-800">
        🔄 Reusable Block
      </p>
      {reusableName && (
        <p className="text-xs text-blue-600 mt-1">{reusableName}</p>
      )}
      <p className="text-xs text-blue-500 mt-2">ID: {data.reusableId}</p>
    </div>
  );
}

export function ReusableInspectorComponent({
  block,
  onChange,
}: {
  block: Block;
  onChange: (block: Block) => void;
}) {
  const data = block.data as { reusableId: string };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Reusable Block</h3>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Dieser Block wird aus der Reusable Block Library geladen.
        </p>
        <p className="text-xs text-blue-600 mt-2">ID: {data.reusableId}</p>
      </div>
    </div>
  );
}



