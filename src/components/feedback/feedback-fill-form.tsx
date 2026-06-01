"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  FeedbackQuestion,
  FeedbackAnswers,
  FeedbackAnswerValue,
} from "@/lib/feedback/types";

interface Props {
  shareToken: string;
  title: string;
  description: string | null;
  collectName: boolean;
  collectEmail: boolean;
  questions: FeedbackQuestion[];
}

export default function FeedbackFillForm({
  shareToken,
  title,
  description,
  collectName,
  collectEmail,
  questions,
}: Props) {
  const [answers, setAnswers] = useState<FeedbackAnswers>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const collectsPersonalData = collectName || collectEmail;

  const setAnswer = (qid: string, value: FeedbackAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const toggleMulti = (qid: string, optionId: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[qid])
        ? (prev[qid] as string[])
        : [];
      const next = current.includes(optionId)
        ? current.filter((v) => v !== optionId)
        : [...current, optionId];
      return { ...prev, [qid]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (collectsPersonalData && !consent) {
      setError("Bitte stimme der Datenverarbeitung zu.");
      return;
    }

    // Client-Pflichtfeld-Check
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty =
        v == null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError(`Bitte beantworte die Pflichtfrage: „${q.label}“`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/feedback/submit/${shareToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectName ? name : undefined,
          email: collectEmail ? email : undefined,
          website,
          consent,
          answers,
        }),
      });

      if (res.status === 404) {
        setError("Dieses Formular ist nicht mehr verfügbar.");
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Absenden fehlgeschlagen. Bitte erneut versuchen.");
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-white rounded-lg shadow p-8 text-center"
      >
        <p className="text-2xl mb-2">✅</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Vielen Dank!
        </h2>
        <p className="text-gray-600">
          Dein Feedback wurde erfolgreich übermittelt.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-2 text-gray-600 whitespace-pre-wrap">{description}</p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3"
        >
          {error}
        </div>
      )}

      {questions.map((q) => {
        const describedById = `desc-${q.id}`;
        return (
          <fieldset
            key={q.id}
            className="bg-white rounded-lg shadow p-5 border-0"
          >
            <legend className="font-medium text-gray-900 mb-3">
              {q.label}
              {q.required && (
                <span className="text-red-500" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </legend>

            {q.type === "FREE_TEXT" && (
              <textarea
                rows={4}
                aria-required={q.required}
                maxLength={5000}
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                placeholder="Deine Antwort..."
              />
            )}

            {q.type === "SINGLE_CHOICE" && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      aria-required={q.required}
                      className="h-4 w-4 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "MULTI_CHOICE" && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const arr = Array.isArray(answers[q.id])
                    ? (answers[q.id] as string[])
                    : [];
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        value={opt.id}
                        checked={arr.includes(opt.id)}
                        onChange={() => toggleMulti(q.id, opt.id)}
                        className="h-4 w-4 text-rose-500 focus:ring-rose-500 rounded"
                      />
                      <span className="text-gray-800">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "RATING" && (
              <div
                role="radiogroup"
                aria-label={q.label}
                aria-describedby={describedById}
                className="flex gap-1"
              >
                <span id={describedById} className="sr-only">
                  Bewertung von 1 bis 5 Sternen
                </span>
                {[1, 2, 3, 4, 5].map((star) => {
                  const current = (answers[q.id] as number) ?? 0;
                  const active = star <= current;
                  return (
                    <label
                      key={star}
                      className="cursor-pointer text-3xl leading-none"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={star}
                        checked={current === star}
                        onChange={() => setAnswer(q.id, star)}
                        className="sr-only"
                      />
                      <span className="sr-only">
                        {star} {star === 1 ? "Stern" : "Sterne"}
                      </span>
                      <span
                        aria-hidden="true"
                        className={active ? "text-amber-500" : "text-gray-300"}
                      >
                        ★
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}

      {collectsPersonalData && (
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          {collectName && (
            <div>
              <label
                htmlFor="fb-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Name (optional)
              </label>
              <input
                id="fb-name"
                type="text"
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
          {collectEmail && (
            <div>
              <label
                htmlFor="fb-email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                E-Mail (optional)
              </label>
              <input
                id="fb-email"
                type="email"
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
          <div className="flex items-start gap-2">
            <input
              id="fb-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="fb-consent" className="text-sm text-gray-700">
              Ich stimme zu, dass meine Angaben zur Bearbeitung des Feedbacks
              verarbeitet werden. Weitere Informationen in der{" "}
              <Link
                href="/datenschutzerklaerung"
                target="_blank"
                className="text-rose-500 hover:text-rose-600 underline"
              >
                Datenschutzerklärung
              </Link>
              .
            </label>
          </div>
        </div>
      )}

      {/* Honeypot — visuell versteckt, nicht für Screenreader-Fokus */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
      >
        {isLoading ? "Wird gesendet..." : "Feedback absenden"}
      </button>
    </form>
  );
}
