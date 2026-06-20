"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";

export default function ImportPagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!confirm("Möchtest du wirklich alle Seiten von der Original-Website importieren?\n\nHinweis: Bereits existierende Seiten werden übersprungen.")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/import-all-pages", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import fehlgeschlagen");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Seiten importieren
          </h1>
          <p className="text-gray-600 mt-1">
            Importiert alle Seiten von familien-herz-zeit.de
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Automatischer Import
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Dieses Tool importiert alle Seiten von der Original-Website und erstellt sie im Page Builder Format.
                Bereits existierende Seiten werden übersprungen.
              </p>
            </div>

            <button
              onClick={handleImport}
              disabled={isLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Importiere..." : "Alle Seiten importieren"}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">Fehler</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-semibold">Import abgeschlossen</p>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Erfolgreich: {result.summary.successful}</p>
                    <p>Fehlgeschlagen: {result.summary.failed}</p>
                    <p>Gesamt: {result.summary.total}</p>
                  </div>
                </div>

                {result.results.some((r: any) => !r.success) && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-semibold mb-2">Fehlgeschlagene Seiten:</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {result.results
                        .filter((r: any) => !r.success)
                        .map((r: any, idx: number) => (
                          <li key={idx}>
                            {r.page.title}: {r.error || "Unbekannter Fehler"}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push("/admin/pages")}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    Zu den Seiten
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    Erneut importieren
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminContainer>
  );
}

