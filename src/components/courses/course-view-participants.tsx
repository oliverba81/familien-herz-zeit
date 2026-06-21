"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBerlinDateTime } from "@/lib/utils/datetime";

interface Booking {
  id: string;
  parentName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childFirstName: string | null;
  childLastName: string | null;
  childAgeMonths: number | null;
  childBirthDate: Date | null;
  hasAokVoucher: boolean;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: Date;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  childNotes: string | null;
  paymentProvider?: string | null; // "STRIPE", "PAYPAL", oder null
  paymentStatus?: string | null;
  session?: {
    id: string;
    startAt: Date;
    durationMinutes: number;
  } | null;
}

interface CourseViewParticipantsProps {
  courseId: string;
}

export default function CourseViewParticipants({ courseId }: CourseViewParticipantsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings?courseId=${courseId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Fehler beim Laden der Buchungen";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Fehler beim Laden der Buchungen (Status: ${response.status})`;
        }
        console.error("API-Fehler:", errorMessage, response.status);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Stelle sicher, dass data ein Array ist
      if (!Array.isArray(data)) {
        console.error("Unerwartetes Datenformat:", data);
        setBookings([]);
        return;
      }
      
      // Filtere nur PENDING und CONFIRMED Buchungen (keine CANCELLED)
      const filteredBookings = data.filter(
        (booking: Booking) => booking.status === "PENDING" || booking.status === "CONFIRMED"
      );
      setBookings(filteredBookings);
    } catch (err: any) {
      console.error("Fehler beim Laden der Buchungen:", err);
      setBookings([]); // Setze leeres Array bei Fehler
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void (async () => {
      await loadBookings();
    })();
  }, [loadBookings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Bestätigt
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
    // Zeige nichts, da keine Zahlung erforderlich war
    return null;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Wird geladen...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
        Noch keine angemeldeten Teilnehmer für diesen Kurs.
      </div>
    );
  }

  // Trenne bestätigte und ausstehende Buchungen
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Bestätigte Teilnehmer */}
      {confirmedBookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Bestätigte Teilnehmer ({confirmedBookings.length})
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Kontakt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Kind
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Adresse
                    </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Besonderheiten
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {confirmedBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.parentName || `${booking.firstName} ${booking.lastName}`}
                          </div>
                          {getPaymentIcon(booking)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Buchung: {formatBerlinDateTime(booking.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <a
                            href={`mailto:${booking.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {booking.email}
                          </a>
                        </div>
                        {booking.phone && (
                          <div className="text-xs text-gray-600 mt-1">📞 {booking.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.childName || (booking.childFirstName && booking.childLastName) ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              👶 {booking.childName || `${booking.childFirstName} ${booking.childLastName}`}
                            </div>
                            {booking.childAgeMonths && (
                              <div className="text-xs text-gray-600">
                                {booking.childAgeMonths} Monate alt
                              </div>
                            )}
                            {booking.childBirthDate && (
                              <div className="text-xs text-gray-500">
                                Geboren: {new Date(booking.childBirthDate).toLocaleDateString("de-DE")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Kein Kind angegeben</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.street || booking.city ? (
                          <div className="text-sm text-gray-900">
                            {booking.street && <div>{booking.street}</div>}
                            {(booking.zipCode || booking.city) && (
                              <div>
                                {booking.zipCode} {booking.city}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Nicht angegeben</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {booking.childNotes && (
                            <div className="text-xs text-gray-600">
                              <strong>Notizen:</strong> {booking.childNotes}
                            </div>
                          )}
                          {!booking.childNotes && (
                            <span className="text-sm text-gray-400 italic">Keine Notizen</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ausstehende Buchungen */}
      {pendingBookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Ausstehende Buchungen ({pendingBookings.length})
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Kontakt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Kind
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Adresse
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Besonderheiten
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.parentName || `${booking.firstName} ${booking.lastName}`}
                          </div>
                          {getPaymentIcon(booking)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Buchung: {formatBerlinDateTime(booking.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <a
                            href={`mailto:${booking.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {booking.email}
                          </a>
                        </div>
                        {booking.phone && (
                          <div className="text-xs text-gray-600 mt-1">📞 {booking.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.childName || (booking.childFirstName && booking.childLastName) ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              👶 {booking.childName || `${booking.childFirstName} ${booking.childLastName}`}
                            </div>
                            {booking.childAgeMonths && (
                              <div className="text-xs text-gray-600">
                                {booking.childAgeMonths} Monate alt
                              </div>
                            )}
                            {booking.childBirthDate && (
                              <div className="text-xs text-gray-500">
                                Geboren: {new Date(booking.childBirthDate).toLocaleDateString("de-DE")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Kein Kind angegeben</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.street || booking.city ? (
                          <div className="text-sm text-gray-900">
                            {booking.street && <div>{booking.street}</div>}
                            {(booking.zipCode || booking.city) && (
                              <div>
                                {booking.zipCode} {booking.city}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Nicht angegeben</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {booking.childNotes && (
                            <div className="text-xs text-gray-600">
                              <strong>Notizen:</strong> {booking.childNotes}
                            </div>
                          )}
                          {!booking.childNotes && (
                            <span className="text-sm text-gray-400 italic">Keine Notizen</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

