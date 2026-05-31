"use client";

import { useState, useEffect } from "react";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

interface Course {
  id: string;
  title: string;
  sessions?: Array<{ startAt: Date }>;
}

interface Booking {
  id: string;
  parentName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childAgeMonths: number | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: Date;
  course: Course;
  session?: {
    id: string;
    startAt: Date;
    durationMinutes: number;
  } | null;
}

interface BookingsTableProps {
  filters: {
    status?: string;
    courseId?: string;
    q?: string;
  };
}

export default function BookingsTable({ filters }: BookingsTableProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.courseId) params.append("courseId", filters.courseId);
      if (filters.q) params.append("q", filters.q);

      const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Buchungen");
      }

      const data = await response.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filters.status, filters.courseId, filters.q]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Aktualisieren");
      }

      // Reload bookings
      await loadBookings();
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Bestätigt
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Storniert
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Ausstehend
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Wird geladen...
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

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
        Keine Buchungen gefunden.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kurs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Eltern
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kind
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatBerlinDateTime(booking.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.course.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.course.sessions && booking.course.sessions.length > 0
                      ? formatBerlinDateTime(booking.course.sessions[0].startAt)
                      : booking.session
                      ? formatBerlinDateTime(booking.session.startAt)
                      : "Kein Termin"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(booking.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{booking.parentName}</div>
                  {booking.phone && (
                    <div className="text-xs text-gray-500">{booking.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{booking.email}</div>
                </td>
                <td className="px-6 py-4">
                  {booking.childName ? (
                    <>
                      <div className="text-sm text-gray-900">{booking.childName}</div>
                      {booking.childAgeMonths && (
                        <div className="text-xs text-gray-500">
                          {booking.childAgeMonths} Monate
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    disabled={updating === booking.id}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  >
                    <option value="PENDING">Ausstehend</option>
                    <option value="CONFIRMED">Bestätigt</option>
                    <option value="CANCELLED">Storniert</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

