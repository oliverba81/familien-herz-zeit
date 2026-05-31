"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function PaypalBookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const orderId = searchParams.get("token");
  const courseId = searchParams.get("courseId");

  useEffect(() => {
    if (!orderId || !courseId) {
      setError("Fehlende Parameter");
      setLoading(false);
      return;
    }

    // Versuche bookingData aus sessionStorage oder Cookie zu holen
    let bookingData = null;
    
    // 1. Versuche sessionStorage
    const sessionStorageData = sessionStorage.getItem(`paypal_booking_${orderId}`);
    if (sessionStorageData) {
      try {
        bookingData = JSON.parse(sessionStorageData);
      } catch (parseError) {
        console.warn("Failed to parse bookingData from sessionStorage:", parseError);
      }
    }
    
    // 2. Falls nicht gefunden, versuche Cookie
    if (!bookingData) {
      const cookieName = `paypal_booking_${orderId}`;
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === cookieName && value) {
          try {
            bookingData = JSON.parse(decodeURIComponent(value));
            // Lösche Cookie nach dem Lesen
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            break;
          } catch (parseError) {
            console.warn("Failed to parse bookingData from cookie:", parseError);
          }
        }
      }
    }

    // Capture PayPal Order und erstelle Booking
    // bookingData wird auch aus der PayPal Order Metadata geholt, falls nicht im sessionStorage
    const captureOrder = async () => {
      try {
        const response = await fetch("/api/course-bookings/paypal-capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            bookingData: bookingData, // Kann null sein, wird dann aus PayPal Order geholt
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Fehler beim Verarbeiten der Zahlung");
        }

        const result = await response.json();
        if (result.ok) {
          setSuccess(true);
          // Lösche bookingData aus sessionStorage
          sessionStorage.removeItem(`paypal_booking_${orderId}`);
        } else {
          throw new Error(result.message || "Fehler beim Erstellen der Buchung");
        }
      } catch (err: any) {
        setError(err.message || "Fehler beim Verarbeiten der Zahlung");
      } finally {
        setLoading(false);
      }
    };

    captureOrder();
  }, [orderId, courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Zahlung wird verarbeitet...
            </h1>
            <p className="text-gray-600">
              Bitte warte einen Moment, während wir deine Zahlung verarbeiten.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Fehler
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>
          <div className="space-y-3">
            <Link
              href={`/kurse/${courseId}`}
              className="block w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Zurück zum Kurs
            </Link>
            <Link
              href="/kurse"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Zu den Kursen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Zahlung erfolgreich!
            </h1>
            <p className="text-gray-600 mb-4">
              Vielen Dank für deine Buchung. Wir haben deine Zahlung erhalten und deine Buchungsanfrage wurde erstellt.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Du erhältst in Kürze eine Bestätigungs-E-Mail mit allen Details zu deiner Buchung.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/kurse"
              className="block w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Zurück zu den Kursen
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function PaypalBookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Lade...
            </h1>
          </div>
        </div>
      </div>
    }>
      <PaypalBookingSuccessContent />
    </Suspense>
  );
}

// Verhindere Prerendering für diese Route
export const dynamic = 'force-dynamic';

