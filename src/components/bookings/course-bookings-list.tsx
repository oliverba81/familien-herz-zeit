"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

interface Booking {
  id: string;
  parentName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childAgeMonths: number | null;
  hasAokVoucher: boolean;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: Date;
  paymentProvider?: string | null; // "STRIPE", "PAYPAL", oder null
  paymentStatus?: string | null;
  session?: {
    id: string;
    startAt: Date;
    durationMinutes: number;
  } | null;
}

interface CourseBookingsListProps {
  courseId: string;
}

export default function CourseBookingsList({ courseId }: CourseBookingsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings?courseId=${courseId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Buchungen");
      }

      const data = await response.json();
      
      // Debug: Log alle Buchungen
      console.log("Geladene Buchungen:", data.length);
      const stripeBookings = data.filter((b: Booking) => b.paymentProvider === "STRIPE");
      if (stripeBookings.length > 0) {
        console.log("Stripe-Buchungen gefunden:", stripeBookings.length, stripeBookings);
      }
      
      // Filtere stornierte Buchungen heraus
      const filteredBookings = data.filter((booking: Booking) => booking.status !== "CANCELLED");
      setBookings(filteredBookings);
    } catch (err: any) {
      console.error("Fehler:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void (async () => {
      await loadBookings();
    })();
  }, [loadBookings]);

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

  const getPaymentIcon = (booking: Booking) => {
    // Wenn AOK-Gutschein, zeige AOK-Icon (hat immer Priorität)
    if (booking.hasAokVoucher === true) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded border border-blue-200"
          title="Bezahlt mit AOK-Gutschein"
        >
          🏥 AOK-Gutschein
        </span>
      );
    }

    // Wenn PayPal
    if (booking.paymentProvider === "PAYPAL") {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded"
          title="Bezahlt mit PayPal"
        >
          💳 PayPal
        </span>
      );
    }

    // Wenn Stripe
    if (booking.paymentProvider === "STRIPE") {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded"
          title="Bezahlt mit Karte (Stripe)"
        >
          💳 Karte
        </span>
      );
    }

    // Wenn keine Zahlung (kostenloser Kurs oder noch nicht bezahlt)
    return null;
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Wird geladen...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
        Noch keine Buchungen für diesen Kurs.
      </div>
    );
  }

  // Filtere nur bestätigte Buchungen für die Teilnehmer-Übersicht
  const confirmedBookings = bookings.filter(b => b.status === "CONFIRMED");

  return (
    <div className="space-y-6">
      {/* Kompakte Teilnehmer-Übersicht */}
      {confirmedBookings.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Bestätigte Teilnehmer ({confirmedBookings.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {confirmedBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.parentName}
                  </div>
                  {getPaymentIcon(booking)}
                </div>
                {booking.childName ? (
                  <div className="text-xs text-gray-600 mt-1">
                    👶 <span className="font-medium">{booking.childName}</span>
                    {booking.childAgeMonths && (
                      <span className="text-gray-500 ml-1">
                        ({booking.childAgeMonths} Monate)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic mt-1">Kein Kind angegeben</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detaillierte Tabelle */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Buchungsdatum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Eltern / Kontakt
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                E-Mail
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Kind (Name & Alter)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Termin (falls spezifisch)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatBerlinDateTime(booking.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(booking.status)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="text-sm font-medium text-gray-900">{booking.parentName}</div>
                    {getPaymentIcon(booking)}
                  </div>
                  {booking.phone && (
                    <div className="text-xs text-gray-500 mt-1">
                      📞 {booking.phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a 
                    href={`mailto:${booking.email}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  {booking.childName ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-900">
                        👶 {booking.childName}
                      </div>
                      {booking.childAgeMonths ? (
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                          {booking.childAgeMonths} Monate alt
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">Alter nicht angegeben</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Kein Kind angegeben</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {booking.session ? (
                    <div>
                      <div className="font-medium">{formatBerlinDateTime(booking.session.startAt)}</div>
                      <div className="text-xs text-gray-500">{booking.session.durationMinutes} Min</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Alle Termine</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
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
    </div>
  );
}

