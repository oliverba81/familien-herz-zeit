"use client";

import { useState } from "react";

export default function LogsCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (!confirm("Möchtest du alte Logs (älter als 30 Tage) jetzt löschen?")) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/logs/cleanup", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        // Reload page after 1 second to show updated count
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(`❌ Fehler: ${data.error || "Unbekannter Fehler"}`);
      }
    } catch (error: any) {
      setMessage(`❌ Fehler: ${error.message || "Unbekannter Fehler"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCleanup}
        disabled={isLoading}
        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Bereinige..." : "Bereinigen"}
      </button>
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  );
}

