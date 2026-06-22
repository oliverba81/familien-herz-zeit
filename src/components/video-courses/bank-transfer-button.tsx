"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/track";

export interface VideoBankTransferDetails {
  accountHolder: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  info: string | null;
  amountCents: number;
  reference: string;
}

interface BankTransferButtonProps {
  videoCourseId: string;
  discountCode?: string | null;
  withdrawalConsent?: boolean;
  onError?: (error: string) => void;
  onSuccess: (details: VideoBankTransferDetails) => void;
}

export default function BankTransferButton({
  videoCourseId,
  discountCode,
  withdrawalConsent,
  onError,
  onSuccess,
}: BankTransferButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/video-courses/bank-transfer-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoCourseId,
          discountCode: discountCode || undefined,
          withdrawalConsent: withdrawalConsent ?? false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.href = `/user/login?redirect=${encodeURIComponent(
            window.location.pathname
          )}`;
          return;
        }
        throw new Error(data.error || "Fehler beim Anlegen der Bestellung");
      }

      const data = await response.json();
      track("checkout_started", { provider: "banktransfer", videoCourseId });
      onSuccess(data.bankTransfer as VideoBankTransferDetails);
    } catch (err: any) {
      const message = err.message || "Ein Fehler ist aufgetreten";
      if (onError) onError(message);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Wird verarbeitet..." : "Per Überweisung bezahlen"}
    </button>
  );
}
