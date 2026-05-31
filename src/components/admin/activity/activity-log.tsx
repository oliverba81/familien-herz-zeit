"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AuditLog {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actor: {
    id: string;
    email: string;
    role: string;
  } | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  action: string;
  message: string | null;
  meta: any;
}

const entityTypeOptions = [
  { value: "", label: "Alle" },
  { value: "Page", label: "Seiten" },
  { value: "Course", label: "Kurse" },
  { value: "Booking", label: "Buchungen" },
  { value: "VideoCourse", label: "Videokurse" },
  { value: "CourseSeries", label: "Serien" },
  { value: "Media", label: "Medien" },
  { value: "User", label: "Benutzer" },
];

const actionOptions = [
  { value: "", label: "Alle" },
  { value: "CREATE", label: "Erstellt" },
  { value: "UPDATE", label: "Aktualisiert" },
  { value: "DELETE", label: "Gelöscht" },
  { value: "STATUS_CHANGE", label: "Status geändert" },
  { value: "SYNC", label: "Synchronisiert" },
  { value: "BATCH_UPDATE", label: "Batch-Update" },
  { value: "OTHER", label: "Sonstiges" },
];

export default function ActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (entityType) params.append("entityType", entityType);
      if (action) params.append("action", action);
      if (search) params.append("q", search);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      params.append("take", "100");

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Aktivitäten");
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const handleReset = () => {
    setEntityType("");
    setAction("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setTimeout(() => loadLogs(), 100);
  };

  const getEntityLink = (log: AuditLog): string | null => {
    if (!log.entityId) return null;

    switch (log.entityType) {
      case "Page":
        return `/admin/pages`;
      case "Course":
        return `/admin/courses/${log.entityId}`;
      case "Booking":
        return `/admin/bookings`;
      case "VideoCourse":
        return `/admin/video-courses/${log.entityId}`;
      case "CourseSeries":
        return `/admin/course-series/${log.entityId}`;
      case "Media":
        return `/admin/media`;
      case "User":
        return `/admin/users`;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      STATUS_CHANGE: "bg-yellow-100 text-yellow-800",
      SYNC: "bg-purple-100 text-purple-800",
      BATCH_UPDATE: "bg-indigo-100 text-indigo-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[action] || colors.OTHER}`}>
        {action}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Lade Aktivitäten...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <form onSubmit={handleFilter} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity-Typ
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              >
                {entityTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aktion
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              >
                {actionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suche
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nach Benutzer, Entity oder Nachricht..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bis
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              Filtern
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Zurücksetzen
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Zeit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Benutzer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aktion
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nachricht
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Keine Aktivitäten gefunden
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const entityLink = getEntityLink(log);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.actor?.email || log.actorEmail || (
                          <span className="text-gray-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {entityLink && log.entityId ? (
                          <Link
                            href={entityLink}
                            className="text-rose-600 hover:text-rose-900"
                          >
                            {log.entityType}
                            {log.entityLabel && `: ${log.entityLabel}`}
                          </Link>
                        ) : (
                          <span>
                            {log.entityType}
                            {log.entityLabel && `: ${log.entityLabel}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                        {log.message || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.meta && (
                          <details className="cursor-pointer">
                            <summary className="text-rose-500 hover:text-rose-600 text-xs">
                              Anzeigen
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-auto">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}





