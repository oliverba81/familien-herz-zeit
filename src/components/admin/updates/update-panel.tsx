"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChangelogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
}

interface CheckResult {
  current: string;
  latest: string;
  currentShort: string;
  latestShort: string;
  behind: number;
  upToDate: boolean;
  currentSubject: string;
  currentDate: string;
  changelog: ChangelogEntry[];
}

interface StatusResult {
  state: "idle" | "running" | "success" | "error";
  step?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  fromSha?: string;
  toSha?: string;
  logTail?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UpdatePanel() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/updates/status", { cache: "no-store" });
      const data: StatusResult = await res.json();
      if (!res.ok) {
        setStatusError((data as any)?.error || "Status konnte nicht geladen werden.");
        return data;
      }
      setStatus(data);
      setStatusError(null);
      if (data.state !== "running") {
        stopPolling();
        setApplying(false);
      }
      return data;
    } catch (err: any) {
      // Während des PM2-Neustarts ist die App kurz nicht erreichbar → weiter pollen.
      setStatusError(null);
      return null;
    }
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
  }, [fetchStatus, stopPolling]);

  // Beim Laden: bestehenden Status holen; falls noch ein Update läuft → pollen.
  useEffect(() => {
    (async () => {
      const data = await fetchStatus();
      if (data && data.state === "running") {
        setApplying(true);
        startPolling();
      }
    })();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch("/api/admin/updates/check", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setCheckError(data?.error || "Update-Prüfung fehlgeschlagen.");
        return;
      }
      setCheck(data);
    } catch (err: any) {
      setCheckError(err?.message || "Update-Prüfung fehlgeschlagen.");
    } finally {
      setChecking(false);
    }
  };

  const handleApply = async () => {
    const ok = confirm(
      "Update jetzt starten?\n\n" +
        "Dabei wird der Server exakt auf den Stand von GitHub (origin/main) gesetzt.\n" +
        "• Nicht committete Änderungen an versionierten Dateien auf dem Server gehen verloren.\n" +
        "• Das Datenbankschema wird via 'prisma db push' synchronisiert (bei destruktiven Änderungen bricht das Update sicher ab).\n" +
        "• Die App wird am Ende neu gestartet.\n\n" +
        "Hinweis: Dieser Vorgang funktioniert nur auf dem Server (Linux), nicht in der lokalen Windows-Entwicklung."
    );
    if (!ok) return;

    setApplying(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/admin/updates/apply", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data?.error || "Update konnte nicht gestartet werden.");
        setApplying(false);
        return;
      }
      startPolling();
    } catch (err: any) {
      setStatusError(err?.message || "Update konnte nicht gestartet werden.");
      setApplying(false);
    }
  };

  const isRunning = status?.state === "running" || applying;

  return (
    <div className="space-y-6">
      {/* Aktueller Stand / Versionsanzeige */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aktueller Stand</h2>
            {check ? (
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Installierte Version:</span>{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
                    {check.currentShort}
                  </code>{" "}
                  {check.currentSubject && (
                    <span className="text-gray-600">– {check.currentSubject}</span>
                  )}
                </p>
                {check.currentDate && (
                  <p className="text-gray-500">
                    Stand: {formatDate(check.currentDate)}
                  </p>
                )}
                <p>
                  <span className="font-medium">Neueste Version (GitHub):</span>{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
                    {check.latestShort}
                  </code>
                </p>
                <div className="pt-1">
                  {check.upToDate ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Aktuell – keine Updates verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      ⬆️ {check.behind} Commit{check.behind === 1 ? "" : "s"} hinter GitHub
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Noch nicht geprüft. Klicke auf „Auf Updates prüfen“.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleCheck}
              disabled={checking || isRunning}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? "Prüfe …" : "Auf Updates prüfen"}
            </button>
            <button
              onClick={handleApply}
              disabled={isRunning}
              className="px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Update läuft …" : "Update starten"}
            </button>
          </div>
        </div>

        {checkError && (
          <p className="mt-4 text-sm text-red-600">❌ {checkError}</p>
        )}
      </div>

      {/* Update-Status / Live-Log */}
      {(status && status.state !== "idle") || statusError ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Update-Status</h2>

          {statusError && (
            <p className="mt-2 text-sm text-red-600">❌ {statusError}</p>
          )}

          {status && status.state !== "idle" && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {status.state === "running" && (
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Läuft – Schritt: {status.step || "…"}
                  </span>
                )}
                {status.state === "success" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Erfolgreich abgeschlossen
                  </span>
                )}
                {status.state === "error" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Fehlgeschlagen
                  </span>
                )}
              </div>

              {status.message && (
                <p className="text-gray-700">{status.message}</p>
              )}
              <p className="text-gray-500">
                {status.startedAt && <>Gestartet: {formatDate(status.startedAt)} </>}
                {status.finishedAt && <>· Beendet: {formatDate(status.finishedAt)}</>}
              </p>

              {status.state === "success" && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                  Tipp: Lade die Seite mit <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>{" "}
                  neu (Hard-Reload), falls Inhalte ohne Styles laden.
                </p>
              )}

              {status.logTail && (
                <pre className="mt-2 max-h-72 overflow-auto rounded bg-gray-900 text-gray-100 text-xs p-3 whitespace-pre-wrap">
                  {status.logTail}
                </pre>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Changelog */}
      {check && check.changelog && check.changelog.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Changelog (letzte {check.changelog.length} Commits von GitHub)
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Commit</th>
                  <th className="py-2 pr-4 font-medium">Nachricht</th>
                  <th className="py-2 pr-4 font-medium">Autor</th>
                  <th className="py-2 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {check.changelog.map((entry) => (
                  <tr key={entry.sha} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-4">
                      <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
                        {entry.shortSha}
                      </code>
                    </td>
                    <td className="py-2 pr-4 text-gray-800">{entry.message}</td>
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                      {entry.author}
                    </td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
