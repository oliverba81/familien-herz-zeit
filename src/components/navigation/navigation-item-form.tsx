"use client";

import { useState, useEffect } from "react";

interface Page {
  id: string;
  slug: string;
  title: string;
  published: boolean;
}

interface NavigationItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { label: string; href: string | null }) => void;
  initialData?: {
    label: string;
    href: string | null;
  };
  mode: "create" | "edit";
}

export default function NavigationItemForm({
  open,
  onClose,
  onSubmit,
  initialData,
  mode,
}: NavigationItemFormProps) {
  const [label, setLabel] = useState(initialData?.label || "");
  const [linkType, setLinkType] = useState<"page" | "manual" | "none">(
    initialData?.href ? "manual" : "none"
  );
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [manualHref, setManualHref] = useState(initialData?.href || "");
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(initialData?.label || "");
      loadPages();
    }
  }, [open]);

  useEffect(() => {
    if (open && pages.length > 0 && initialData?.href) {
      // Prüfe ob href zu einer Seite gehört
      const matchingPage = pages.find((p) => `/${p.slug}` === initialData.href);
      if (matchingPage) {
        setLinkType("page");
        setSelectedPageId(matchingPage.id);
        setManualHref("");
      } else {
        setLinkType("manual");
        setManualHref(initialData.href);
        setSelectedPageId("");
      }
    } else if (open && !initialData?.href) {
      setLinkType("none");
      setManualHref("");
      setSelectedPageId("");
    }
  }, [open, pages, initialData]);

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const response = await fetch("/api/pages");
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Seiten:", error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      alert("Bitte geben Sie ein Label ein");
      return;
    }

    let href: string | null = null;

    if (linkType === "page") {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      if (selectedPage) {
        href = `/${selectedPage.slug}`;
      }
    } else if (linkType === "manual") {
      href = manualHref.trim() || null;
    }

    onSubmit({ label: label.trim(), href });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {mode === "create" ? "Neuer Navigation Eintrag" : "Navigation Eintrag bearbeiten"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="z.B. Startseite"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link-Typ
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="linkType"
                  value="none"
                  checked={linkType === "none"}
                  onChange={() => setLinkType("none")}
                  className="mr-2"
                />
                <span>Kein Link (Dropdown)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="linkType"
                  value="page"
                  checked={linkType === "page"}
                  onChange={() => setLinkType("page")}
                  className="mr-2"
                />
                <span>Seite auswählen</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="linkType"
                  value="manual"
                  checked={linkType === "manual"}
                  onChange={() => setLinkType("manual")}
                  className="mr-2"
                />
                <span>Manueller Link</span>
              </label>
            </div>
          </div>

          {linkType === "page" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seite auswählen
              </label>
              {loadingPages ? (
                <div className="text-sm text-gray-500">Lade Seiten...</div>
              ) : (
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  required={linkType === "page"}
                >
                  <option value="">-- Seite auswählen --</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title} {!page.published && "(Nicht veröffentlicht)"} - /{page.slug}
                    </option>
                  ))}
                </select>
              )}
              {selectedPageId && (
                <p className="mt-2 text-sm text-gray-500">
                  Link wird automatisch auf: <code className="bg-gray-100 px-1 rounded">/{pages.find(p => p.id === selectedPageId)?.slug}</code> gesetzt
                </p>
              )}
            </div>
          )}

          {linkType === "manual" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link (z.B. /kontakt oder https://example.com)
              </label>
              <input
                type="text"
                value={manualHref}
                onChange={(e) => setManualHref(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="/kontakt"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
            >
              {mode === "create" ? "Erstellen" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

