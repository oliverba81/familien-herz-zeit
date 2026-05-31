"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Tag {
  id: string;
  slug: string;
  name: string;
}

interface Sign {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  tags: Tag[];
  updatedAt: string;
  createdAt: string;
}

export default function SignsAdmin() {
  const router = useRouter();
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    loadSigns();
    loadTags();
  }, [searchQuery, statusFilter, tagFilter]);

  const loadSigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (tagFilter) params.append("tag", tagFilter);

      const response = await fetch(`/api/signs?${params.toString()}`);
      if (!response.ok) throw new Error("Fehler beim Laden");
      const data = await response.json();
      setSigns(data);
    } catch (error) {
      console.error("Error loading signs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      // Lade alle Tags aus den Signs
      const response = await fetch("/api/signs");
      if (!response.ok) return;
      const data: Sign[] = await response.json();
      const uniqueTags = new Map<string, Tag>();
      data.forEach((sign) => {
        sign.tags.forEach((tag) => {
          if (!uniqueTags.has(tag.id)) {
            uniqueTags.set(tag.id, tag);
          }
        });
      });
      setAllTags(Array.from(uniqueTags.values()));
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Möchten Sie das Zeichen "${title}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/signs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Löschen");
      }

      loadSigns();
    } catch (error) {
      console.error("Error deleting sign:", error);
      alert("Fehler beim Löschen des Zeichens");
    }
  };

  if (loading && signs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Lade Zeichen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Suche nach Titel oder Beschreibung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Alle Status</option>
            <option value="DRAFT">Entwurf</option>
            <option value="PUBLISHED">Veröffentlicht</option>
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Alle Tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </select>
          <Link
            href="/admin/signs/new"
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors whitespace-nowrap"
          >
            Neues Zeichen
          </Link>
        </div>
      </div>

      {/* Table */}
      {signs.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 mb-4">Noch keine Zeichen vorhanden.</p>
          <Link
            href="/admin/signs/new"
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Erstes Zeichen erstellen
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktualisiert
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {signs.map((sign) => (
                <tr key={sign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sign.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {sign.description.substring(0, 100)}
                      {sign.description.length > 100 ? "..." : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {sign.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sign.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {sign.status === "PUBLISHED" ? "Veröffentlicht" : "Entwurf"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sign.updatedAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {sign.status === "PUBLISHED" && (
                        <Link
                          href={`/zeichen/${sign.slug}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-900"
                          title="Vorschau"
                        >
                          👁️
                        </Link>
                      )}
                      <Link
                        href={`/admin/signs/${sign.id}`}
                        className="text-rose-600 hover:text-rose-900"
                      >
                        Bearbeiten
                      </Link>
                      <button
                        onClick={() => handleDelete(sign.id, sign.title)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



