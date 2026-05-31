"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

interface WaitlistEntry {
  id: string;
  courseId: string | null;
  course?: {
    id: string;
    title: string;
  } | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  childFirstName: string | null;
  childLastName: string | null;
  childBirthDate: string | null;
  childNotes: string | null;
  interestLabel: string | null;
  notes: string | null;
  createdAt: string;
  childAgeMonths: number | null;
}

interface WaitlistTableProps {
  filters: {
    courseId?: string;
    q?: string;
  };
}

export default function WaitlistTable({ filters }: WaitlistTableProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.courseId) params.append("courseId", filters.courseId);
      if (filters.q) params.append("q", filters.q);

      const response = await fetch(`/api/admin/waitlist?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Warteliste");
      }

      const data = await response.json();
      setEntries(data);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.courseId, filters.q]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/waitlist/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Fehler beim Löschen");
      }

      await loadEntries();
    } catch (err: any) {
      alert(err.message || "Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Warteliste wird geladen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
        Noch keine Einträge auf der Warteliste.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Eingegangen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kurs / Interesse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontakt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kind
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notizen
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => {
              const createdAt = formatBerlinDateTime(new Date(entry.createdAt));
              const childName =
                entry.childFirstName || entry.childLastName
                  ? `${entry.childFirstName || ""} ${entry.childLastName || ""}`.trim()
                  : null;

              const courseLabel =
                entry.course?.title ||
                entry.interestLabel ||
                "Kein Kurs zugeordnet";

              const ageLabel =
                entry.childAgeMonths != null
                  ? `${entry.childAgeMonths} Monate`
                  : null;

              const notesPreview =
                entry.notes && entry.notes.length > 80
                  ? `${entry.notes.slice(0, 80)}…`
                  : entry.notes || "";

              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{createdAt}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {courseLabel}
                    </div>
                    {entry.course && (
                      <div className="text-xs text-gray-500 mt-1">
                        Kurs-ID: {entry.course.id}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {entry.firstName} {entry.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{entry.email}</div>
                    {entry.phone && (
                      <div className="text-xs text-gray-500">{entry.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {childName ? (
                      <>
                        <div className="text-sm text-gray-900">{childName}</div>
                        {ageLabel && (
                          <div className="text-xs text-gray-500">{ageLabel}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {notesPreview ? (
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {notesPreview}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/waitlist/${entry.id}`}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Bearbeiten
                      </Link>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

