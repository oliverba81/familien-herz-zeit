"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { bookingSchema, type BookingData } from "@/lib/validations/bookings";
import ErrorMessage from "@/components/auth/error-message";
import { track } from "@/lib/analytics/track";
import { formatCents } from "@/lib/utils/money";

interface BookingFormProps {
  courseId: string;
}

export default function BookingForm({ courseId }: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ mailSent: boolean } | null>(null);
  const [acceptsAokVoucher, setAcceptsAokVoucher] = useState(false);
  const [coursePriceCents, setCoursePriceCents] = useState<number>(0);
  const [loadingCourse, setLoadingCourse] = useState(true);

  // Lade Kurs-Daten, um zu prüfen, ob AOK-Gutscheine akzeptiert werden und den Preis zu laden
  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (response.ok) {
          const course = await response.json();
          setAcceptsAokVoucher(course.acceptsAokVoucher || false);
          setCoursePriceCents(course.priceCents || 0);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Kurses:", err);
      } finally {
        setLoadingCourse(false);
      }
    };
    loadCourse();
  }, [courseId]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<BookingData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      courseId,
      firstName: "",
      lastName: "",
      street: "",
      zipCode: "",
      city: "",
      email: "",
      phone: "",
      hasAokVoucher: false,
      childFirstName: "",
      childLastName: "",
      childBirthDate: "",
      childNotes: "",
      howDidYouHear: "",
      privacyAccepted: false,
      termsAccepted: false,
      website: "", // Honeypot
    },
  });

  // Beobachte hasAokVoucher Checkbox für dynamische Preis-Anzeige
  const hasAokVoucher = watch("hasAokVoucher");

  // Prüfe ob Zahlung erforderlich ist
  const requiresPayment = !hasAokVoucher && coursePriceCents > 0;

  const onSubmit = async (data: BookingData) => {
    // Wenn Zahlung erforderlich ist, wird das Formular nicht direkt abgesendet
    // Stattdessen werden Zahlungsbuttons angezeigt
    if (requiresPayment) {
      return;
    }

    // Direkte Buchung ohne Zahlung (AOK-Gutschein oder kostenlos)
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Prüfe Content-Type, bevor wir versuchen JSON zu parsen
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || "Buchung fehlgeschlagen");
          } catch (parseError) {
            // Falls JSON-Parsing fehlschlägt, verwende Standard-Fehlermeldung
            throw new Error(`Buchung fehlgeschlagen (Status: ${response.status})`);
          }
        } else {
          // Server hat HTML oder anderen Content-Type zurückgegeben
          const text = await response.text();
          console.error("Server-Fehler (nicht-JSON):", text.substring(0, 200));
          throw new Error(`Buchung fehlgeschlagen (Status: ${response.status})`);
        }
      }

      const result = await response.json();
      setSuccess({ mailSent: result.mailSent ?? false });
      reset();
      
      // Analytics Event: Booking submitted
      track("booking_submitted", { courseId });
    } catch (err: any) {
      setError(err.message || "Fehler beim Absenden der Buchung");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePayment = async (data: BookingData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/course-bookings/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingData: data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Erstellen der Zahlung");
      }

      const result = await response.json();
      if (result.checkoutUrl) {
        track("checkout_started", { provider: "stripe", courseId });
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("Keine Checkout URL erhalten");
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Starten der Zahlung");
      setIsLoading(false);
    }
  };

  const handlePaypalPayment = async (data: BookingData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/course-bookings/create-paypal-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingData: data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Erstellen der PayPal Order");
      }

      const result = await response.json();
      if (result.approveUrl) {
        // Speichere bookingData im sessionStorage UND Cookie für späteren Capture
        // Cookie bleibt über Redirects erhalten
        const bookingDataStr = JSON.stringify(data);
        sessionStorage.setItem(`paypal_booking_${result.orderId}`, bookingDataStr);
        
        // Cookie setzen (gültig für 1 Stunde, überlebt Redirects)
        const cookieName = `paypal_booking_${result.orderId}`;
        const cookieValue = encodeURIComponent(bookingDataStr);
        const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString(); // 1 Stunde
        document.cookie = `${cookieName}=${cookieValue}; expires=${expires}; path=/; SameSite=Lax`;
        
        track("checkout_started", { provider: "paypal", courseId });
        window.location.href = result.approveUrl;
      } else {
        throw new Error("Keine PayPal Approve URL erhalten");
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Starten der Zahlung");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Vielen Dank für deine Buchung!
        </h3>
        <p className="text-green-700 mb-2">
          Wir haben deine Buchung erhalten und melden uns in Kürze zur Bestätigung.
        </p>
        {!success.mailSent && (
          <p className="text-sm text-yellow-700 mt-2">
            Hinweis: Die Bestätigungs-E-Mail konnte nicht gesendet werden. Deine Buchung wurde jedoch erfolgreich gespeichert.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      {/* Honeypot */}
      <input
        type="text"
        {...register("website")}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vorname *
          </label>
          <input
            {...register("firstName")}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Max"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nachname *
          </label>
          <input
            {...register("lastName")}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Mustermann"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Strasse & Nr *
        </label>
        <input
          {...register("street")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="Musterstraße 123"
        />
        {errors.street && (
          <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PLZ *
          </label>
          <input
            {...register("zipCode")}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="12345"
          />
          {errors.zipCode && (
            <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ort *
          </label>
          <input
            {...register("city")}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Berlin"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Handynummer *
        </label>
        <input
          {...register("phone")}
          type="tel"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="+49 123 456789"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          {...register("email")}
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="max@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {!loadingCourse && acceptsAokVoucher && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <input
                {...register("hasAokVoucher")}
                type="checkbox"
                id="hasAokVoucher"
                className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
              />
              <label htmlFor="hasAokVoucher" className="ml-2 text-sm text-gray-700">
                <span className="font-medium">AOK-Gutschein vorhanden?</span>
                <p className="text-xs text-gray-600 mt-1">
                  Wenn du einen AOK-Gutschein hast, ist der Kurs für dich kostenlos. Bitte bringe den Gutschein zur ersten Kursstunde mit und zeige ihn vor.
                </p>
              </label>
            </div>
          </div>
          
          {/* Dynamische Preis-Anzeige - zeigt sich nur wenn Checkbox aktiviert */}
          {hasAokVoucher && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Dein Preis:</span>
                <span className="text-lg font-bold text-green-600">
                  Kostenlos (AOK-Gutschein)
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                ✓ Der Kurs ist für dich kostenlos, da du einen AOK-Gutschein hast.
              </p>
            </div>
          )}
        </>
      )}

      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Informationen zum Kind</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorname des Kindes *
            </label>
            <input
              {...register("childFirstName")}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Emma"
            />
            {errors.childFirstName && (
              <p className="mt-1 text-sm text-red-600">{errors.childFirstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Familienname des Kindes *
            </label>
            <input
              {...register("childLastName")}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Mustermann"
            />
            {errors.childLastName && (
              <p className="mt-1 text-sm text-red-600">{errors.childLastName.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Geburtsdatum des Kindes *
          </label>
          <input
            {...register("childBirthDate")}
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            max={new Date().toISOString().split("T")[0]}
          />
          {errors.childBirthDate && (
            <p className="mt-1 text-sm text-red-600">{errors.childBirthDate.message}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Besonderheiten (optional)
          </label>
          <textarea
            {...register("childNotes")}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="z.B. Hörbehinderung, Downsyndrom, Eltern zweisprachig, Muttersprache nicht deutsch, Kurs mit Geschwisterkind, oder andere wichtige Anmerkungen"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Wie bist du auf meinen Kurs aufmerksam geworden? (optional)
        </label>
        <input
          {...register("howDidYouHear")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Empfehlung, Google, Facebook, etc."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-start">
          <input
            {...register("privacyAccepted")}
            type="checkbox"
            id="privacyAccepted"
            className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
          />
          <label htmlFor="privacyAccepted" className="ml-2 text-sm text-gray-700">
            Ich stimme zu, dass meine Angaben aus dem Kontaktformular zur Beantwortung meiner Anfrage erhoben und verarbeitet werden. Detaillierte Informationen zum Umgang mit Nutzerdaten findest du in unserer{" "}
            <Link href="/datenschutzerklaerung" target="_blank" className="text-rose-500 hover:text-rose-600 underline">
              Datenschutzerklärung
            </Link>
            . *
          </label>
        </div>
        {errors.privacyAccepted && (
          <p className="text-sm text-red-600">{errors.privacyAccepted.message}</p>
        )}

        <div className="flex items-start">
          <input
            {...register("termsAccepted")}
            type="checkbox"
            id="termsAccepted"
            className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
          />
          <label htmlFor="termsAccepted" className="ml-2 text-sm text-gray-700">
            Ich habe die{" "}
            <Link href="/kursbedingungen" target="_blank" className="text-rose-500 hover:text-rose-600 underline">
              Kursbedingungen
            </Link>
            {" "}zur Kenntnis genommen und erkenne sie hiermit an. *
          </label>
        </div>
        {errors.termsAccepted && (
          <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
        )}
      </div>

      {requiresPayment ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Zahlung erforderlich:</strong> Bitte wähle eine Zahlungsmethode aus.
            </p>
            <p className="text-sm text-blue-700">
              Preis: {formatCents(coursePriceCents)}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => handleSubmit((data) => handleStripePayment(data))()}
            disabled={isLoading}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Wird verarbeitet..." : "Mit Karte bezahlen (Stripe)"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">oder</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit((data) => handlePaypalPayment(data))()}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Wird verarbeitet...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.174 1.351 1.05 3.3.93 4.857v.004h-3.22c-.105-1.547-.197-2.894-1.05-3.527-.84-.623-2.157-.735-3.216-.735h-3.98l-.73 4.18h2.49c.703 0 1.27.59 1.27 1.313 0 .723-.567 1.313-1.27 1.313H9.22l-.692 3.96h2.49c.703 0 1.27.59 1.27 1.313 0 .723-.567 1.313-1.27 1.313H6.77l-.73 4.18h3.49c.703 0 1.27.59 1.27 1.313 0 .723-.567 1.313-1.27 1.313H5.22l-.692 3.96h3.49c.703 0 1.27.59 1.27 1.313 0 .723-.567 1.313-1.27 1.313H2.47l-.73 4.18h4.606c.703 0 1.27.59 1.27 1.313 0 .723-.567 1.313-1.27 1.313z"/>
                </svg>
                <span>Mit PayPal bezahlen</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Wird gesendet..." : "Verbindlich Anmelden"}
        </button>
      )}
    </form>
  );
}
