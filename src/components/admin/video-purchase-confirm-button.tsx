"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  purchaseId: string;
}

export default function VideoPurchaseConfirmButton({ purchaseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (
      !window.confirm(
        "Zahlungseingang bestätigen und Zugang freischalten? Der Kunde erhält die Zugangs-E-Mail."
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/video-purchases/${purchaseId}/confirm`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Bestätigung fehlgeschlagen");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Fehler");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={confirm}
        disabled={loading}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Wird freigeschaltet…" : "Zahlung bestätigen & freischalten"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
