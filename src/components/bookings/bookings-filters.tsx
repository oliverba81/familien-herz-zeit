"use client";

import { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
}

interface BookingsFiltersProps {
  courses: Course[];
  onFilterChange: (filters: {
    status?: string;
    courseId?: string;
    q?: string;
  }) => void;
  onExport: () => void;
}

export default function BookingsFilters({
  courses,
  onFilterChange,
  onExport,
}: BookingsFiltersProps) {
  const [status, setStatus] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const handleFilter = () => {
    onFilterChange({
      status: status || undefined,
      courseId: courseId || undefined,
      q: query || undefined,
    });
  };

  const handleReset = () => {
    setStatus("");
    setCourseId("");
    setQuery("");
    onFilterChange({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Alle</option>
            <option value="PENDING">Ausstehend</option>
            <option value="CONFIRMED">Bestätigt</option>
            <option value="CANCELLED">Storniert</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kurs
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Alle Kurse</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Suche (Name/E-Mail)
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilter();
              }
            }}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleFilter}
            className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            Filtern
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onExport}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          CSV Export
        </button>
      </div>
    </div>
  );
}

