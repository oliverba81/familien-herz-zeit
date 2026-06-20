"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavigationItemForm from "./navigation-item-form";

interface NavigationItem {
  id: string;
  location: "HEADER" | "FOOTER";
  label: string;
  href: string | null;
  order: number;
  parentId: string | null;
  children?: NavigationItem[];
}

export default function NavigationEditor() {
  const router = useRouter();
  const [headerItems, setHeaderItems] = useState<NavigationItem[]>([]);
  const [footerItems, setFooterItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formLocation, setFormLocation] = useState<"HEADER" | "FOOTER">("HEADER");
  const [formParentId, setFormParentId] = useState<string | undefined>(undefined);
  const [formInitialData, setFormInitialData] = useState<{ label: string; href: string | null } | undefined>(undefined);

  useEffect(() => {
    loadNavigation();
  }, []);

  const loadNavigation = async () => {
    try {
      const [headerRes, footerRes] = await Promise.all([
        fetch("/api/navigation?location=HEADER"),
        fetch("/api/navigation?location=FOOTER"),
      ]);

      const headerData = await headerRes.json();
      const footerData = await footerRes.json();

      setHeaderItems(headerData);
      setFooterItems(footerData);
    } catch (error) {
      console.error("Fehler beim Laden der Navigation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (location: "HEADER" | "FOOTER", parentId?: string) => {
    setFormMode("create");
    setFormLocation(location);
    setFormParentId(parentId);
    setFormInitialData(undefined);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: { label: string; href: string | null }) => {
    try {
      if (formMode === "create") {
        const response = await fetch("/api/navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: formLocation,
            label: data.label,
            href: data.href,
            order: formLocation === "HEADER" ? headerItems.length : footerItems.length,
            parentId: formParentId || null,
          }),
        });

        if (!response.ok) {
          alert("Fehler beim Erstellen");
          return;
        }
      } else if (formMode === "edit" && editingId) {
        const item = [...headerItems, ...footerItems].find((i) => i.id === editingId);
        if (!item) {
          alert("Item nicht gefunden");
          return;
        }

        const response = await fetch(`/api/navigation/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item,
            label: data.label,
            href: data.href,
          }),
        });

        if (!response.ok) {
          alert("Fehler beim Aktualisieren");
          return;
        }
      }

      router.refresh();
      loadNavigation();
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Fehler:", error);
      alert("Ein Fehler ist aufgetreten");
    }
  };

  const handleEdit = (item: NavigationItem) => {
    setFormMode("edit");
    setFormLocation(item.location);
    setFormParentId(undefined);
    setFormInitialData({
      label: item.label,
      href: item.href,
    });
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Element wirklich löschen? Alle Unterelemente werden ebenfalls gelöscht.")) {
      return;
    }

    try {
      const response = await fetch(`/api/navigation/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Fehler beim Löschen");
        return;
      }

      router.refresh();
      loadNavigation();
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler beim Löschen");
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const indentClass = level > 0 ? `ml-${Math.min(level * 6, 24)} border-l-2 border-gray-200 pl-4` : "";
    const levelColors = [
      "", // Level 0 - keine spezielle Farbe
      "bg-blue-50", // Level 1
      "bg-green-50", // Level 2
      "bg-yellow-50", // Level 3
      "bg-orange-50", // Level 4
      "bg-red-50", // Level 5
    ];
    const bgColor = levelColors[Math.min(level, 5)] || "";

    return (
      <div key={item.id} className={indentClass}>
        <div className={`flex items-center gap-2 py-2 hover:bg-gray-50 rounded ${bgColor}`}>
          <div className="flex-1 flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(item.id)}
                className="text-gray-400 hover:text-gray-600"
                title={`Ebene ${level + 1}`}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            )}
            {!hasChildren && level > 0 && (
              <span className="text-gray-300 w-4">•</span>
            )}
            <span className="font-medium">{item.label}</span>
            {level > 0 && (
              <span className="text-xs text-gray-400">(Ebene {level + 1})</span>
            )}
            {item.href && (
              <span className="text-sm text-gray-500">({item.href})</span>
            )}
            {!item.href && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                Dropdown
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(item)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Bearbeiten
            </button>
            {level < 4 && (
              <button
                onClick={() => handleAdd(item.location, item.id)}
                className="text-sm text-green-600 hover:text-green-800"
                title={`Unterelement hinzufügen (max. 5 Ebenen)`}
              >
                Unterelement
              </button>
            )}
            <button
              onClick={() => handleDelete(item.id)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Löschen
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Lade Navigation...</div>;
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Header Navigation</h2>
            <button
              onClick={() => handleAdd("HEADER")}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Neuer Eintrag
            </button>
          </div>
          <div className="space-y-1">
            {headerItems.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Keine Einträge vorhanden</p>
            ) : (
              headerItems.map((item) => renderItem(item))
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Footer Navigation</h2>
            <button
              onClick={() => handleAdd("FOOTER")}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Neuer Eintrag
            </button>
          </div>
          <div className="space-y-1">
            {footerItems.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Keine Einträge vorhanden</p>
            ) : (
              footerItems.map((item) => renderItem(item))
            )}
          </div>
        </div>
      </div>

      <NavigationItemForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={formInitialData}
        mode={formMode}
      />
    </>
  );
}

