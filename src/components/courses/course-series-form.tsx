"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSeriesSchema, type CourseSeriesData } from "@/lib/validations/course-series";
import { formatCents, euroToCents, centsToEuro } from "@/lib/utils/money";
import ErrorMessage from "@/components/auth/error-message";
import { CourseSeries } from "@prisma/client";

interface CourseSeriesFormProps {
  initialData?: CourseSeries & {
    _count?: {
      courses: number;
    };
  };
  mode: "create" | "edit";
}

const weekdayOptions = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 7, label: "Sonntag" },
];

export default function CourseSeriesForm({ initialData, mode }: CourseSeriesFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    cancelled: number;
    skippedLocked: number;
    keptBecauseBooked: number;
    warnings: string[];
  } | null>(null);
  const [priceInput, setPriceInput] = useState<string>(
    initialData ? centsToEuro(initialData.priceCents).toString() : ""
  );

  // Konvertiere Date zu YYYY-MM-DD Format
  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourseSeriesData>({
    resolver: zodResolver(courseSeriesSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description,
          durationMinutes: initialData.durationMinutes,
          priceCents: initialData.priceCents,
          maxParticipants: initialData.maxParticipants,
          location: initialData.location || "",
          status: initialData.status,
          timezone: initialData.timezone,
          frequency: initialData.frequency,
          intervalWeeks: initialData.intervalWeeks,
          weekdays: (initialData.weekdays as number[]) || [],
          startDate: formatDateForInput(initialData.startDate),
          endDate: formatDateForInput(initialData.endDate),
          startTime: initialData.startTime,
        }
      : {
          title: "",
          description: "",
          durationMinutes: 60,
          priceCents: 0,
          maxParticipants: 10,
          location: "",
          status: "DRAFT",
          timezone: "Europe/Berlin",
          frequency: "WEEKLY",
          intervalWeeks: 1,
          weekdays: [],
          startDate: "",
          endDate: "",
          startTime: "10:00",
        },
    mode: "onChange",
  });

  const priceCents = watch("priceCents");
  const weekdays = watch("weekdays") || [];

  const handleWeekdayToggle = (value: number) => {
    const current = weekdays as number[];
    if (current.includes(value)) {
      setValue("weekdays", current.filter((d) => d !== value));
    } else {
      setValue("weekdays", [...current, value]);
    }
  };

  const onSubmit = async (data: CourseSeriesData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/course-series" 
        : `/api/course-series/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ein Fehler ist aufgetreten");
      }

      const series = await response.json();

      if (mode === "create") {
        router.push(`/admin/course-series/${series.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!initialData?.id) return;

    setIsSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/course-series/${initialData.id}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Synchronisieren");
      }

      const result = await response.json();
      setSyncResult({
        created: result.created || 0,
        updated: result.updated || 0,
        cancelled: result.cancelled || 0,
        skippedLocked: result.skippedLocked || 0,
        keptBecauseBooked: result.keptBecauseBooked || 0,
        warnings: result.warnings || [],
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Fehler beim Synchronisieren");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      {syncResult && (
        <div className={`p-4 rounded-lg mb-4 ${
          syncResult.warnings.length > 0 ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"
        }`}>
          <p className="text-sm font-semibold mb-2">
            ✅ Synchronisierung abgeschlossen:
          </p>
          <ul className="text-sm space-y-1 mb-2">
            <li>• {syncResult.created} Termine erstellt</li>
            <li>• {syncResult.updated} Termine aktualisiert</li>
            {syncResult.cancelled > 0 && (
              <li>• {syncResult.cancelled} Termine abgesagt</li>
            )}
            {syncResult.skippedLocked > 0 && (
              <li>• {syncResult.skippedLocked} Termine übersprungen (nur ungefährliche Felder aktualisiert)</li>
            )}
            {syncResult.keptBecauseBooked > 0 && (
              <li>• {syncResult.keptBecauseBooked} Termine beibehalten (haben Buchungen)</li>
            )}
          </ul>
          {syncResult.warnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-yellow-300">
              <p className="text-xs font-semibold text-yellow-800 mb-1">Warnungen:</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {syncResult.warnings.slice(0, 5).map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
                {syncResult.warnings.length > 5 && (
                  <li>• ... und {syncResult.warnings.length - 5} weitere Warnungen</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titel *
        </label>
        <input
          {...register("title")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Baby-Yoga wöchentlich"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beschreibung *
        </label>
        <textarea
          {...register("description")}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="Beschreibung der Kurs-Serie..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Startdatum *
          </label>
          <input
            {...register("startDate")}
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enddatum *
          </label>
          <input
            {...register("endDate")}
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Startzeit *
          </label>
          <input
            {...register("startTime")}
            type="time"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dauer (Minuten) *
          </label>
          <input
            {...register("durationMinutes", { valueAsNumber: true })}
            type="number"
            min="15"
            max="480"
            step="15"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-600">{errors.durationMinutes.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wochentage *
        </label>
        <div className="grid grid-cols-4 gap-2">
          {weekdayOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={weekdays.includes(option.value)}
                onChange={() => handleWeekdayToggle(option.value)}
                className="mr-2"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.weekdays && (
          <p className="mt-1 text-sm text-red-600">{errors.weekdays.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Intervall (Wochen) *
        </label>
        <input
          {...register("intervalWeeks", { valueAsNumber: true })}
          type="number"
          min="1"
          max="12"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          1 = jede Woche, 2 = jede 2. Woche, etc.
        </p>
        {errors.intervalWeeks && (
          <p className="mt-1 text-sm text-red-600">{errors.intervalWeeks.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preis (in Euro) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceInput}
            onChange={(e) => {
              const value = e.target.value;
              setPriceInput(value);
              if (value === "" || value === "." || value === ",") {
                setValue("priceCents", 0);
              } else {
                const euro = parseFloat(value.replace(",", "."));
                if (!isNaN(euro) && euro >= 0) {
                  setValue("priceCents", euroToCents(euro));
                }
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">
            Aktuell: {formatCents(priceCents || 0)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max. Teilnehmer *
          </label>
          <input
            {...register("maxParticipants", { valueAsNumber: true })}
            type="number"
            min="1"
            max="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          {errors.maxParticipants && (
            <p className="mt-1 text-sm text-red-600">{errors.maxParticipants.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            {...register("status")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          >
            <option value="DRAFT">Entwurf</option>
            <option value="PUBLISHED">Veröffentlicht</option>
            <option value="CANCELLED">Abgesagt</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ort (optional)
        </label>
        <input
          {...register("location")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Studio 1, Hauptstraße 123"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Wird gespeichert..." : "Speichern"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/course-series")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        {mode === "edit" && initialData && (
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Synchronisiere..." : "Termine generieren / synchronisieren"}
          </button>
        )}
      </div>
    </form>
  );
}

