"use client";

import { useCallback, useEffect, useState } from "react";

interface ReusableBlockRow {
  id: string;
  name: string;
  updatedAt: string;
}

/**
 * Verwaltung globaler/wiederverwendbarer Blöcke: auflisten, umbenennen, löschen.
 * Erstellt werden Blöcke aus dem Visual-Builder ("Auswahl als globalen Block speichern").
 */
export default function ReusableBlocksManager() {
  const [items, setItems] = useState<ReusableBlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reusable-blocks");
      if (res.ok) {
        const data: ReusableBlockRow[] = await res.json();
        setItems(data);
        setNames(Object.fromEntries(data.map((d) => [d.id, d.name])));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rename = useCallback(
    async (id: string) => {
      const name = (names[id] ?? "").trim();
      if (!name) return;
      const res = await fetch(`/api/reusable-blocks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setStatus(res.ok ? "✓ Umbenannt" : "Fehler beim Umbenennen");
      window.setTimeout(() => setStatus(null), 2500);
      if (res.ok) void load();
    },
    [names, load]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("Diesen globalen Block löschen? Seiten, die ihn referenzieren, zeigen dann einen Hinweis.")) {
        return;
      }
      const res = await fetch(`/api/reusable-blocks/${id}`, { method: "DELETE" });
      setStatus(res.ok ? "✓ Gelöscht" : "Fehler beim Löschen");
      window.setTimeout(() => setStatus(null), 2500);
      if (res.ok) void load();
    },
    [load]
  );

  if (loading) return <p className="text-gray-500">Lädt …</p>;

  return (
    <div className="space-y-4">
      {status && <p className="text-sm text-gray-600">{status}</p>}
      <p className="text-sm text-gray-600">
        Globale Blöcke werden im Visual-Builder über die Aktion zum Speichern der Auswahl
        angelegt und überall, wo sie referenziert sind, zentral aktualisiert. Die <b>ID</b> wird
        beim Einfügen verwendet.
      </p>
      {items.length === 0 ? (
        <p className="text-gray-500">Noch keine globalen Blöcke.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <input
                value={names[item.id] ?? ""}
                onChange={(e) => setNames((n) => ({ ...n, [item.id]: e.target.value }))}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <code className="text-xs text-gray-400">{item.id.slice(0, 8)}…</code>
              <button
                type="button"
                onClick={() => void rename(item.id)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-600 text-white"
              >
                Umbenennen
              </button>
              <button
                type="button"
                onClick={() => void remove(item.id)}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
