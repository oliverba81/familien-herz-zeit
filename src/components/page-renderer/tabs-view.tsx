"use client";

import { useState } from "react";

export interface TabItem {
  label?: string;
  content?: string;
}

/**
 * Tabs-Block: interaktive Reiter (Client-Insel). Wird im Editor (config render)
 * UND live (renderPuckTree) genutzt → identische Ausgabe.
 */
export function TabsView({ items }: { items?: TabItem[] }) {
  const list = items ?? [];
  const [active, setActive] = useState(0);
  if (list.length === 0) {
    return <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">Keine Reiter</div>;
  }
  const current = Math.min(active, list.length - 1);
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
        {list.map((item, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            onClick={() => setActive(i)}
            className={
              i === current
                ? "px-4 py-2 -mb-px border-b-2 border-rose-500 text-rose-600 font-semibold"
                : "px-4 py-2 -mb-px border-b-2 border-transparent text-gray-500 hover:text-gray-700"
            }
          >
            {item.label || `Reiter ${i + 1}`}
          </button>
        ))}
      </div>
      <div className="pt-4 text-gray-700 whitespace-pre-line" role="tabpanel">
        {list[current]?.content}
      </div>
    </div>
  );
}
