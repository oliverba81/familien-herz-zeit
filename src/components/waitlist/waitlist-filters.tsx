"use client";

import { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
}

interface WaitlistFiltersProps {
  courses: Course[];
  initialFilters?: {
    courseId?: string;
    q?: string;
  };
  onFilterChange: (filters: {
    courseId?: string;
    q?: string;
  }) => void;
}

export default function WaitlistFilters({
  courses,
  initialFilters,
  onFilterChange,
}: WaitlistFiltersProps) {
  const [courseId, setCourseId] = useState<string>(initialFilters?.courseId || "");
  const [query, setQuery] = useState<string>(initialFilters?.q || "");

  // Wende Initial-Filter einmal an (z. B. wenn von Kurs-Detailseite mit courseId verlinkt)
  useEffect(() => {
    if (initialFilters && (initialFilters.courseId || initialFilters.q)) {
      onFilterChange({
        courseId: initialFilters.courseId || undefined,
        q: initialFilters.q || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    onFilterChange({
      courseId: courseId || undefined,
      q: query || undefined,
    });
  };

  const handleReset = () => {
    setCourseId("");
    setQuery("");
    onFilterChange({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
}

