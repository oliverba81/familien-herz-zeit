"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/track";

interface PaypalButtonProps {
  videoCourseId: string;
  priceCents: number;
  discountCode?: string | null;
  onError?: (error: string) => void;
}

export default function PaypalButton({
  videoCourseId,
  priceCents,
  discountCode,
  onError,
}: PaypalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaypalPurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoCourseId,
          discountCode: discountCode || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          // User nicht eingeloggt -> weiterleiten zum Login
          window.location.href = `/user/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        // Spezielle Fehlerbehandlung für ungültige Rabattcodes
        if (response.status === 400) {
          if (errorData.reason) {
            const reasonMessages: Record<string, string> = {
              NOT_FOUND: "Rabattcode nicht gefunden",
              INACTIVE: "Rabattcode ist nicht aktiv",
              EXPIRED: "Rabattcode ist abgelaufen",
              NOT_APPLICABLE: "Rabattcode ist für diesen Kurs nicht gültig",
              LIMIT_REACHED: "Rabattcode wurde bereits zu oft verwendet",
            };
            throw new Error(reasonMessages[errorData.reason] || errorData.error || "Ungültiger Rabattcode");
          }
          throw new Error(errorData.error || "Ungültiger Rabattcode");
        }
        throw new Error(errorData.error || "Fehler beim Erstellen der PayPal Order");
      }

      const data = await response.json();
      
      // Analytics Event: Checkout started
      track("checkout_started", { provider: "paypal", videoCourseId });
      
      // Redirect zu PayPal
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        throw new Error("Keine PayPal Approve URL erhalten");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Ein Fehler ist aufgetreten";
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <button
        onClick={handlePaypalPurchase}
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
  );
}

