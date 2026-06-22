"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/track";

interface PurchaseButtonProps {
  videoCourseId: string;
  priceCents: number;
  discountCode?: string | null;
  withdrawalConsent?: boolean;
  onError?: (error: string) => void;
}

export default function PurchaseButton({
  videoCourseId,
  priceCents,
  discountCode,
  withdrawalConsent,
  onError,
}: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoCourseId,
          discountCode: discountCode || undefined,
          withdrawalConsent: withdrawalConsent ?? false,
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
        throw new Error(errorData.error || "Fehler beim Erstellen der Checkout Session");
      }

      const data = await response.json();
      
      // Analytics Event: Checkout started
      track("checkout_started", { provider: "stripe", videoCourseId });
      
      // Redirect zu Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Keine Checkout URL erhalten");
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
        onClick={handlePurchase}
        disabled={isLoading}
        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Wird verarbeitet..." : "Jetzt kaufen"}
      </button>
    </div>
  );
}

