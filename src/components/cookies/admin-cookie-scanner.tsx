"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CookieCatalogItem,
  CookieCategory,
  CookieSource,
  mergeWithDefaultCatalog,
  parseCookieCatalog,
  serializeCookieCatalog,
  upsertScanResults,
} from "@/lib/consent/catalog";

const CATEGORY_LABELS: Record<CookieCategory, string> = {
  necessary: "Notwendig",
  statistics: "Statistik",
  marketing: "Marketing",
  unknown: "Unkategorisiert",
};

export default function AdminCookieScanner() {
  const [items, setItems] = useState<CookieCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const totalCount = useMemo(() => items.length, [items]);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) {
          throw new Error("Fehler beim Laden der Einstellungen");
        }
        const data = await response.json();
        const parsed = parseCookieCatalog(data?.cookie_catalog);
        if (!cancelled) {
          setItems(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Cookie-Katalog konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScan = () => {
    if (typeof document === "undefined") return;
    const cookieNames = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split("=")[0])
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    setItems((prev) => upsertScanResults(prev, cookieNames, nowIso));
    setNotice(`Scan abgeschlossen: ${cookieNames.length} Cookies gefunden.`);
  };

  const handleAddKnown = () => {
    setItems((prev) => {
      const merged = mergeWithDefaultCatalog(prev);
      const added = merged.length - prev.length;
      setNotice(
        added > 0
          ? `${added} bekannte Cookie(s) eingefügt. Bitte prüfen und speichern.`
          : "Alle bekannten Cookies sind bereits im Katalog."
      );
      return merged;
    });
  };

  const handleAdd = () => {
    const name = `cookie_${items.length + 1}`;
    setItems((prev) => [
      ...prev,
      {
        name,
        category: "unknown",
      },
    ]);
  };

  const handleUpdate = (name: string, updates: Partial<CookieCatalogItem>) => {
    const sourceUpdate: Partial<CookieCatalogItem> =
      updates.category ||
      updates.purpose !== undefined ||
      updates.provider !== undefined ||
      updates.duration !== undefined ||
      updates.name
        ? { source: "manual" as CookieSource }
        : {};

    setItems((prev) =>
      prev.map((item) =>
        item.name === name ? { ...item, ...updates, ...sourceUpdate } : item
      )
    );
  };

  const handleDelete = (name: string) => {
    setItems((prev) => prev.filter((item) => item.name !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            cookie_catalog: serializeCookieCatalog(items),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }
      setNotice("Cookie-Katalog gespeichert.");
    } catch (err) {
      setError("Cookie-Katalog konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const needsEnrichment = (item: CookieCatalogItem) => {
    const missingCategory = item.category === "unknown";
    const missingPurpose = !item.purpose || item.purpose.trim().length === 0;
    const missingProvider = !item.provider || item.provider.trim().length === 0;
    const missingDuration = !item.duration || item.duration.trim().length === 0;
    return missingCategory || missingPurpose || missingProvider || missingDuration;
  };

  const mergeSuggestions = (
    current: CookieCatalogItem[],
    suggestions: CookieCatalogItem[]
  ): CookieCatalogItem[] => {
    const suggestionMap = new Map(suggestions.map((item) => [item.name, item]));

    return current.map((item) => {
      const suggestion = suggestionMap.get(item.name);
      if (!suggestion) return item;

      const updated: CookieCatalogItem = { ...item };
      let changed = false;

      if (updated.category === "unknown" && suggestion.category !== "unknown") {
        updated.category = suggestion.category;
        changed = true;
      }
      if ((!updated.purpose || updated.purpose.trim().length === 0) && suggestion.purpose) {
        updated.purpose = suggestion.purpose;
        changed = true;
      }
      if ((!updated.provider || updated.provider.trim().length === 0) && suggestion.provider) {
        updated.provider = suggestion.provider;
        changed = true;
      }
      if ((!updated.duration || updated.duration.trim().length === 0) && suggestion.duration) {
        updated.duration = suggestion.duration;
        changed = true;
      }

      if (changed) {
        updated.source = suggestion.source || "ai";
        updated.confidence = suggestion.confidence;
      }

      return updated;
    });
  };

  const handleEnrich = async (targetItems?: CookieCatalogItem[]) => {
    setError(null);
    setNotice(null);

    const candidates = targetItems
      ? targetItems.filter(needsEnrichment)
      : items.filter(needsEnrichment);

    if (candidates.length === 0) {
      setNotice("Keine fehlenden Felder zum Anreichern gefunden.");
      return;
    }

    const limited = candidates.slice(0, 20);
    if (candidates.length > 20) {
      setNotice("Es werden nur die ersten 20 Cookies angereichert.");
    }

    setEnriching(true);

    try {
      const response = await fetch("/api/admin/cookies/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookies: limited }),
      });

      if (!response.ok) {
        throw new Error("Fehler bei der Anreicherung");
      }

      const data = await response.json();
      const suggestions: CookieCatalogItem[] = Array.isArray(data?.items) ? data.items : [];

      if (dryRun) {
        setNotice(`Vorschau: ${suggestions.length} Cookies angereichert.`);
      } else {
        setItems((prev) => mergeSuggestions(prev, suggestions));
        setNotice(`Anreicherung abgeschlossen: ${suggestions.length} Cookies aktualisiert.`);
      }
    } catch (err) {
      setError("Cookie-Anreicherung fehlgeschlagen.");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Cookie-Scanner</h2>
        <p className="text-sm text-gray-600 mt-1">
          Dieser Scanner liest nur Cookies, die im Browser auf dieser Seite sichtbar sind.
          HttpOnly-Cookies (z. B. Login) sowie Cookies von Drittdiensten (Stripe, PayPal,
          reCAPTCHA, Analytics) und anderen Seiten erscheinen hier nicht und müssen manuell
          ergänzt werden. Nutze dafür „Bekannte Cookies einfügen“, um die im System bekannten
          Cookies automatisch in den Katalog zu übernehmen.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleScan}
          className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
        >
          Scan starten
        </button>
        <button
          onClick={() => handleEnrich()}
          disabled={enriching || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {enriching ? "Anreichern..." : "Auto-Anreichern"}
        </button>
        <button
          onClick={handleAddKnown}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Bekannte Cookies einfügen
        </button>
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cookie hinzufügen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="rounded border-gray-300 text-rose-500 focus:ring-rose-500"
        />
        Vorschau (nicht übernehmen)
      </label>

      {loading ? (
        <p className="text-sm text-gray-600">Lade Cookie-Katalog...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Kategorie</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Zweck</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Anbieter</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Laufzeit</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Letzter Scan</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => (
                <tr key={item.name}>
                  <td className="px-3 py-2">
                    <input
                      value={item.name}
                      onChange={(e) => handleUpdate(item.name, { name: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleUpdate(item.name, { category: e.target.value as CookieCategory })
                      }
                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.purpose || ""}
                      onChange={(e) => handleUpdate(item.name, { purpose: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.provider || ""}
                      onChange={(e) => handleUpdate(item.name, { provider: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.duration || ""}
                      onChange={(e) => handleUpdate(item.name, { duration: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString("de-DE") : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEnrich([item])}
                      className="text-sm text-gray-700 hover:text-gray-900 mr-3"
                      disabled={enriching}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => handleDelete(item.name)}
                      className="text-sm text-rose-600 hover:text-rose-700"
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={7}>
                    Keine Cookies erfasst.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-gray-600">
        {error ? <p className="text-rose-600">{error}</p> : null}
        {notice ? <p className="text-emerald-600">{notice}</p> : null}
        <p>Gesamt: {totalCount}</p>
      </div>
    </div>
  );
}
