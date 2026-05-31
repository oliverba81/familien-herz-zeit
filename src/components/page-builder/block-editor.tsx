"use client";

import { useState } from "react";
import { Block, BlockType } from "@/lib/page-builder/types";

interface BlockEditorProps {
  block: Block | null;
  onChange: (block: Block) => void;
}

export default function BlockEditor({ block, onChange }: BlockEditorProps) {
  if (!block) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>Wählen Sie einen Block aus, um ihn zu bearbeiten.</p>
      </div>
    );
  }

  const updateData = (updates: Record<string, any>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...updates,
      },
    });
  };

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Hero Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift
            </label>
            <input
              type="text"
              value={block.data.heading || ""}
              onChange={(e) => updateData({ heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Untertitel
            </label>
            <input
              type="text"
              value={block.data.subheading || ""}
              onChange={(e) => updateData({ subheading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ausrichtung
            </label>
            <select
              value={block.data.align || "center"}
              onChange={(e) => updateData({ align: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="left">Links</option>
              <option value="center">Zentriert</option>
              <option value="right">Rechts</option>
            </select>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Text Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text
            </label>
            <textarea
              value={block.data.text || ""}
              onChange={(e) => updateData({ text: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Bild Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bild-URL
            </label>
            <input
              type="url"
              value={block.data.src || ""}
              onChange={(e) => updateData({ src: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt-Text
            </label>
            <input
              type="text"
              value={block.data.alt || ""}
              onChange={(e) => updateData({ alt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bildunterschrift
            </label>
            <input
              type="text"
              value={block.data.caption || ""}
              onChange={(e) => updateData({ caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Video Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video-URL
            </label>
            <input
              type="url"
              value={block.data.src || ""}
              onChange={(e) => updateData({ src: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={block.data.title || ""}
              onChange={(e) => updateData({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      );

    case "features":
      return (
        <FeaturesEditor block={block} onChange={onChange} />
      );

    case "testimonials":
      return (
        <TestimonialsEditor block={block} onChange={onChange} />
      );

    case "cta":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Call to Action Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Überschrift
            </label>
            <input
              type="text"
              value={block.data.heading || ""}
              onChange={(e) => updateData({ heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text
            </label>
            <textarea
              value={block.data.text || ""}
              onChange={(e) => updateData({ text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button-Text
            </label>
            <input
              type="text"
              value={block.data.buttonLabel || ""}
              onChange={(e) => updateData({ buttonLabel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button-Link
            </label>
            <input
              type="url"
              value={block.data.buttonHref || ""}
              onChange={(e) => updateData({ buttonHref: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Abstand Block</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Größe
            </label>
            <select
              value={block.data.size || "md"}
              onChange={(e) => updateData({ size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="sm">Klein</option>
              <option value="md">Mittel</option>
              <option value="lg">Groß</option>
              <option value="xl">Sehr groß</option>
            </select>
          </div>
        </div>
      );

    default:
      return <div>Unbekannter Block-Typ</div>;
  }
}

function FeaturesEditor({ block, onChange }: BlockEditorProps) {
  const items = block?.data.items || [];

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({
      ...block!,
      data: { items: newItems },
    });
  };

  const addItem = () => {
    onChange({
      ...block!,
      data: { items: [...items, { title: "", text: "" }] },
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block!,
      data: { items: items.filter((_item: any, i: number) => i !== index) },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Features Block</h3>
        <button
          onClick={addItem}
          className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
        >
          + Feature
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Feature {index + 1}</span>
              <button
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Entfernen
              </button>
            </div>
            <input
              type="text"
              value={item.title || ""}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              placeholder="Titel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-rose-500"
            />
            <textarea
              value={item.text || ""}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              placeholder="Beschreibung"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsEditor({ block, onChange }: BlockEditorProps) {
  const items = block?.data.items || [];

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({
      ...block!,
      data: { items: newItems },
    });
  };

  const addItem = () => {
    onChange({
      ...block!,
      data: { items: [...items, { name: "", text: "" }] },
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block!,
      data: { items: items.filter((_item: any, i: number) => i !== index) },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Testimonials Block</h3>
        <button
          onClick={addItem}
          className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
        >
          + Testimonial
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Testimonial {index + 1}</span>
              <button
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Entfernen
              </button>
            </div>
            <input
              type="text"
              value={item.name || ""}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-rose-500"
            />
            <textarea
              value={item.text || ""}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              placeholder="Testimonial Text"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

