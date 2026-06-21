"use client";

import { useState } from "react";
import BookingsFilters from "./bookings-filters";
import BookingsTable from "./bookings-table";

interface BookingsPageClientProps {
  courses: { id: string; title: string }[];
}

export default function BookingsPageClient({ courses }: BookingsPageClientProps) {
  const [filters, setFilters] = useState<{
    status?: string;
    courseId?: string;
    q?: string;
  }>({});

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.q) params.append("q", filters.q);

    const url = `/api/admin/bookings/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <BookingsFilters
        courses={courses}
        onFilterChange={setFilters}
        onExport={handleExport}
      />

      <BookingsTable filters={filters} />

      {/* Status-Legende - ganz unten */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Status-Legende</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
              Ausstehend
            </span>
            <div className="text-sm text-gray-700">
              <p className="font-medium">PENDING</p>
              <p className="text-xs text-gray-600 mt-1">
                Neue Buchung, wartet auf deine Bestätigung. Wird bei der Kapazitätsprüfung mitgezählt.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
              Bestätigt
            </span>
            <div className="text-sm text-gray-700">
              <p className="font-medium">CONFIRMED</p>
              <p className="text-xs text-gray-600 mt-1">
                Buchung wurde bestätigt. Teilnehmer ist offiziell angemeldet. Wird bei der Kapazitätsprüfung mitgezählt.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 whitespace-nowrap">
              Storniert
            </span>
            <div className="text-sm text-gray-700">
              <p className="font-medium">CANCELLED</p>
              <p className="text-xs text-gray-600 mt-1">
                Buchung wurde storniert. Wird nicht mehr bei der Kapazitätsprüfung mitgezählt.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Buchung bestätigen:</strong> Wähle in der Spalte &quot;Aktion&quot; den Status &quot;Bestätigt&quot; aus dem Dropdown-Menü.
          </p>
        </div>
      </div>
    </>
  );
}

