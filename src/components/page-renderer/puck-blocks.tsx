import type { ReactNode } from "react";

/**
 * Geteilte, präsentationale Block-Views (kein DB/Client-State) für Puck.
 * Genutzt im Editor (config render) UND live (renderPuckTree) → identische Ausgabe.
 */

export interface FeatureItem {
  title?: string;
  text?: string;
}

export function FeaturesView({
  title,
  items,
}: {
  title?: string;
  items?: FeatureItem[];
}): ReactNode {
  const list = items ?? [];
  return (
    <div>
      {title ? <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((item, i) => (
          <div key={i} className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface TestimonialItem {
  name?: string;
  text?: string;
}

export function TestimonialsView({
  title,
  items,
}: {
  title?: string;
  items?: TestimonialItem[];
}): ReactNode {
  const list = items ?? [];
  return (
    <div>
      {title ? <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2> : null}
      <div className="space-y-6">
        {list.map((item, i) => (
          <div key={i} className="p-6 bg-gray-50 rounded-lg border-l-4 border-rose-500">
            <p className="text-gray-700 mb-4">{item.text}</p>
            <p className="text-sm font-semibold text-gray-900">— {item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
