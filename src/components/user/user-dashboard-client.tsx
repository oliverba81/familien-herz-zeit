"use client";

import { useState } from "react";

interface UserDashboardClientProps {
  purchaseId: string;
}

export default function UserDashboardClient({ purchaseId }: UserDashboardClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInvoice = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purchaseId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Generieren der Rechnung");
      }

      const data = await response.json();
      
      // Reload page to show invoice
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerateInvoice}
      disabled={isGenerating}
      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? "Wird erstellt..." : "Rechnung erstellen"}
    </button>
  );
}

