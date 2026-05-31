import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import { LogLevel, LogCategory } from "@prisma/client";
import LogsCleanupButton from "@/components/admin/logs-cleanup-button";

interface LogsPageProps {
  searchParams: Promise<{
    level?: string;
    category?: string;
    page?: string;
    search?: string;
    userId?: string;
  }>;
}

const levelColors: Record<LogLevel, string> = {
  INFO: "bg-blue-100 text-blue-800",
  SUCCESS: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  ERROR: "bg-red-100 text-red-800",
};

const categoryLabels: Record<LogCategory, string> = {
  AUTH: "Authentifizierung",
  PAYMENT: "Zahlung",
  ADMIN: "Admin",
  VIDEO: "Video",
  USER: "Benutzer",
  ERROR: "Fehler",
  SYSTEM: "System",
};

export default async function LogsPage({ searchParams }: LogsPageProps) {
  await requireRole(["ADMIN"]);

  const params = await searchParams;
  const level = params.level as LogLevel | undefined;
  const category = params.category as LogCategory | undefined;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const userId = params.userId || "";
  const pageSize = 50;

  // Build where clause
  const where: any = {};
  if (level) {
    where.level = level;
  }
  if (category) {
    where.category = category;
  }
  if (userId) {
    where.userId = userId;
  }
  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  // Get logs with pagination
  const [logs, totalCount, allUsers] = await Promise.all([
    db.systemLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.systemLog.count({ where }),
    // Get all users who have logs (for filter dropdown)
    db.user.findMany({
      where: {
        logs: {
          some: {},
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: {
        email: "asc",
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System-Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Logs werden automatisch nach 30 Tagen gelöscht
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {totalCount} Einträge insgesamt
            </div>
            <LogsCleanupButton />
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <form method="GET" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suche
                </label>
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Nach Nachricht, Aktion oder E-Mail suchen..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  name="level"
                  defaultValue={level || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Alle</option>
                  <option value="INFO">Info</option>
                  <option value="SUCCESS">Erfolg</option>
                  <option value="WARNING">Warnung</option>
                  <option value="ERROR">Fehler</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <select
                  name="category"
                  defaultValue={category || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Alle</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benutzer
                </label>
                <select
                  name="userId"
                  defaultValue={userId || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Alle Benutzer</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.firstName || user.lastName ? `(${user.firstName || ""} ${user.lastName || ""})`.trim() : ""} - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                >
                  Filtern
                </button>

                {level || category || search || userId ? (
                  <a
                    href="/admin/logs"
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Zurücksetzen
                  </a>
                ) : null}
              </div>
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
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kategorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aktion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nachricht
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Benutzer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Keine Logs gefunden
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
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
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${levelColors[log.level]}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {categoryLabels[log.category]}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                        {log.message}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.user ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {log.user.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user.firstName || log.user.lastName
                                ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim()
                                : ""}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {log.user.role}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">System / Extern</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(log.details || log.metadata || log.errorStack) && (
                          <details className="cursor-pointer">
                            <summary className="text-rose-500 hover:text-rose-600">
                              Anzeigen
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-auto">
                              {log.errorStack && (
                                <div className="mb-2">
                                  <strong>Stack:</strong>
                                  <pre className="whitespace-pre-wrap text-red-600">
                                    {log.errorStack}
                                  </pre>
                                </div>
                              )}
                              {log.details && (
                                <div className="mb-2">
                                  <strong>Details:</strong>
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.metadata && (
                                <div>
                                  <strong>Metadata:</strong>
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Seite {page} von {totalPages}
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/logs?${new URLSearchParams({
                      level: level || "",
                      category: category || "",
                      search: search || "",
                      userId: userId || "",
                      page: (page - 1).toString(),
                    }).toString()}`}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Zurück
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`/admin/logs?${new URLSearchParams({
                      level: level || "",
                      category: category || "",
                      search: search || "",
                      userId: userId || "",
                      page: (page + 1).toString(),
                    }).toString()}`}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Weiter
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminContainer>
  );
}
