"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useConsent } from "@/components/consent/consent-provider";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface WiderrufFormState {
  contractReference: string;
  email: string;
  name: string;
  contractType: string;
  contractDate: string;
  message: string;
  website: string; // Honeypot
}

const EMPTY_FORM: WiderrufFormState = {
  contractReference: "",
  email: "",
  name: "",
  contractType: "",
  contractDate: "",
  message: "",
  website: "",
};

type Step = "form" | "confirm" | "done";

export default function WiderrufPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<WiderrufFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reCAPTCHA – nur nach Marketing-Einwilligung (§ 25 TDDDG). Ohne Einwilligung
  // schützt weiterhin das Honeypot-Feld vor Bots.
  const { consent } = useConsent();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const recaptchaAllowed = !!siteKey && consent.marketing === true;
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);

  // Markiere reCAPTCHA als ladebereit, sobald window.grecaptcha verfügbar ist.
  useEffect(() => {
    if (recaptchaAllowed && typeof window !== "undefined" && window.grecaptcha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecaptchaLoaded(true);
    }
  }, [recaptchaAllowed]);

  // Rendere das reCAPTCHA-Widget auf der Bestätigungsstufe (frischer Token).
  useEffect(() => {
    if (
      step === "confirm" &&
      recaptchaLoaded &&
      recaptchaAllowed &&
      recaptchaWidgetId === null &&
      typeof window !== "undefined" &&
      window.grecaptcha &&
      document.getElementById("widerruf-recaptcha")
    ) {
      const widgetId = window.grecaptcha.render("widerruf-recaptcha", {
        sitekey: siteKey,
        callback: (token: string) => setRecaptchaToken(token),
        "expired-callback": () => setRecaptchaToken(null),
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecaptchaWidgetId(widgetId);
    }
  }, [step, recaptchaLoaded, recaptchaAllowed, recaptchaWidgetId, siteKey]);

  const update = (field: keyof WiderrufFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Zurück zur Eingabe: reCAPTCHA-Widget verwerfen, damit es bei erneutem
  // Erreichen der Bestätigungsstufe frisch gerendert wird (das Container-Div
  // wird beim Verlassen von "confirm" aus dem DOM entfernt).
  const goBackToForm = () => {
    setRecaptchaWidgetId(null);
    setRecaptchaToken(null);
    setStep("form");
  };

  // Stufe 1: Widerruf einleiten
  const handleInitiate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!form.contractReference.trim()) {
      setError("Bitte gib deine Bestell- oder Vertragsnummer an.");
      return;
    }
    if (!form.email.trim()) {
      setError("Bitte gib deine E-Mail-Adresse für die Eingangsbestätigung an.");
      return;
    }
    setStep("confirm");
  };

  // Stufe 2: Widerruf verbindlich bestätigen
  const handleConfirm = async () => {
    setError(null);

    if (recaptchaAllowed && !recaptchaToken) {
      setError("Bitte bestätige, dass du kein Roboter bist.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/widerruf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          recaptchaToken: recaptchaToken || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Fehler beim Übermitteln des Widerrufs");
      }

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Fehler beim Übermitteln des Widerrufs");
      if (recaptchaWidgetId !== null && typeof window !== "undefined" && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetId);
        setRecaptchaToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {recaptchaAllowed && (
        <Script
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof window !== "undefined" && window.grecaptcha) {
              setRecaptchaLoaded(true);
            }
          }}
        />
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Vertrag widerrufen</h1>
      <p className="text-gray-600 mb-8">
        Mit diesem Formular kannst du einen mit uns im Fernabsatz geschlossenen Vertrag widerrufen.
        Einzelheiten zu deinem Widerrufsrecht findest du in unserer{" "}
        <Link href="/widerrufsbelehrung" className="text-rose-500 hover:text-rose-600 underline">
          Widerrufsbelehrung
        </Link>
        .
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleInitiate} className="space-y-5">
          <div>
            <label htmlFor="contractReference" className="block text-sm font-medium text-gray-700 mb-1">
              Bestell- oder Vertragsnummer *
            </label>
            <input
              id="contractReference"
              type="text"
              value={form.contractReference}
              onChange={(e) => update("contractReference", e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail-Adresse (für die Eingangsbestätigung) *
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <p className="text-sm text-gray-500">Die folgenden Angaben sind freiwillig:</p>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">
              Vertrag/Leistung (optional)
            </label>
            <input
              id="contractType"
              type="text"
              value={form.contractType}
              onChange={(e) => update("contractType", e.target.value)}
              placeholder="z. B. Babyzeichensprachekurs, Videokurs"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="contractDate" className="block text-sm font-medium text-gray-700 mb-1">
              Bestellt/erhalten am (optional)
            </label>
            <input
              id="contractDate"
              type="date"
              value={form.contractDate}
              onChange={(e) => update("contractDate", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Nachricht (optional)
            </label>
            <textarea
              id="message"
              rows={3}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          <button
            type="submit"
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors"
          >
            Vertrag widerrufen
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Bitte bestätige deinen Widerruf</h2>
            <dl className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Bestell-/Vertragsnummer</dt>
                <dd className="font-medium text-right">{form.contractReference}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">E-Mail</dt>
                <dd className="font-medium text-right">{form.email}</dd>
              </div>
              {form.name && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-right">{form.name}</dd>
                </div>
              )}
              {form.contractType && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Vertrag/Leistung</dt>
                  <dd className="font-medium text-right">{form.contractType}</dd>
                </div>
              )}
              {form.contractDate && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Bestellt/erhalten am</dt>
                  <dd className="font-medium text-right">{form.contractDate}</dd>
                </div>
              )}
            </dl>
            <p className="text-sm text-gray-600 mt-4">
              Mit Klick auf „Widerruf bestätigen“ erklärst du verbindlich den Widerruf des oben genannten
              Vertrags. Du erhältst anschließend eine Eingangsbestätigung per E-Mail.
            </p>
          </div>

          {recaptchaAllowed && (
            <div id="widerruf-recaptcha" aria-label="Captcha" />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={goBackToForm}
              disabled={isLoading}
              className="sm:w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="sm:flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Wird übermittelt..." : "Widerruf bestätigen"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Dein Widerruf ist eingegangen</h2>
          <p className="text-sm text-green-700">
            Vielen Dank. Wir haben deinen Widerruf erhalten und dir eine Eingangsbestätigung an{" "}
            <strong>{form.email}</strong> gesendet. Etwaige bereits geleistete Zahlungen erstatten wir dir
            nach den gesetzlichen Vorgaben.
          </p>
        </div>
      )}
    </main>
  );
}
