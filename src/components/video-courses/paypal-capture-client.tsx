"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";

interface PaypalCaptureClientProps {
  orderId: string;
}

export default function PaypalCaptureClient({ orderId }: PaypalCaptureClientProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mailSent, setMailSent] = useState(false);

  useEffect(() => {
    const captureOrder = async () => {
      try {
        const response = await fetch("/api/paypal/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.reason || "Fehler beim Bestätigen der Zahlung");
        }

        const data = await response.json();
        
        if (data.ok) {
          setStatus("success");
          setWatchUrl(data.watchUrl || null);
          setMailSent(data.mailSent || false);
          
          // Analytics Event: Purchase success (PayPal)
          track("purchase_success", { provider: "paypal" });
        } else {
          throw new Error(data.reason || "Zahlung nicht abgeschlossen");
        }
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Ein Fehler ist aufgetreten");
      }
    };

    captureOrder();
  }, [orderId]);

  if (status === "loading") {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-4"></div>
        <p className="text-gray-600">Zahlung wird bestätigt...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">
          Leider gab es ein Problem
        </h2>
        <p className="text-red-700 mb-4">{error}</p>
        <Link
          href="/videokurse"
          className="inline-block px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors"
        >
          Zurück zu den Videokursen
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="mb-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg
            className="h-6 w-6 text-green-600"
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
        <h2 className="text-lg font-semibold text-green-900 mb-2">
          Zahlung erfolgreich!
        </h2>
        <p className="text-green-700 mb-4">
          {mailSent
            ? "Wir haben Ihnen den Zugangslink per E-Mail geschickt."
            : "Ihr Zugangslink wurde erstellt."}
        </p>
      </div>
      {watchUrl && (
        <Link
          href={watchUrl}
          className="block w-full text-center px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors mb-4"
        >
          Jetzt ansehen
        </Link>
      )}
      <Link
        href="/videokurse"
        className="block text-center text-rose-500 hover:text-rose-600 font-medium"
      >
        Zurück zu den Videokursen
      </Link>
    </div>
  );
}

