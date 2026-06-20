"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, euroToCents, centsToEuro } from "@/lib/utils/money";
import ErrorMessage from "@/components/auth/error-message";

interface CourseSeriesBatchUpdateProps {
  seriesId: string;
}

export default function CourseSeriesBatchUpdate({ seriesId }: CourseSeriesBatchUpdateProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; skippedBooked: number } | null>(null);
  const [applyFromToday, setApplyFromToday] = useState(true);
  const [priceInput, setPriceInput] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [location, setLocation] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CANCELLED" | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Baue fields object (nur gesetzte Felder)
    const fields: any = {};
    if (priceInput) {
      const euro = parseFloat(priceInput.replace(",", "."));
      if (!isNaN(euro) && euro >= 0) {
        fields.priceCents = euroToCents(euro);
      }
    }
    if (durationMinutes !== "") {
      fields.durationMinutes = durationMinutes;
    }
    if (maxParticipants !== "") {
      fields.maxParticipants = maxParticipants;
    }
    if (location !== "") {
      fields.location = location || null;
    }
    if (status !== "") {
      fields.status = status;
    }

    // Prüfe ob mindestens ein Feld gesetzt ist
    if (Object.keys(fields).length === 0) {
      setError("Bitte wähle mindestens ein Feld zum Aktualisieren");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/course-series/${seriesId}/batch-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applyFrom: applyFromToday ? undefined : new Date().toISOString(),
          fields,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Batch-Update");
      }

      const data = await response.json();
      setResult(data);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Massen-Update zukünftiger Termine
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Aktualisiert alle zukünftigen Termine dieser Serie, die noch keine Buchungen haben.
      </p>

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className={`p-4 rounded-lg mb-4 ${
          result.updated > 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
        }`}>
          <p className="text-sm">
            ✅ <strong>{result.updated}</strong> Termine aktualisiert
            {result.skippedBooked > 0 && (
              <span className="ml-2">
                • <strong>{result.skippedBooked}</strong> Termine übersprungen (haben Buchungen)
              </span>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={applyFromToday}
              onChange={(e) => setApplyFromToday(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Ab heute anwenden</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preis (in Euro)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Leer lassen = unverändert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dauer (Minuten)
            </label>
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Leer lassen = unverändert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. Teilnehmer
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="Leer lassen = unverändert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Unverändert</option>
              <option value="DRAFT">Entwurf</option>
              <option value="PUBLISHED">Veröffentlicht</option>
              <option value="CANCELLED">Abgesagt</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ort
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="Leer lassen = unverändert"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Wird aktualisiert..." : "Anwenden"}
        </button>
      </form>
    </div>
  );
}

