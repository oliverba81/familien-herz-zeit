"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema, type CourseData, type CourseSessionData } from "@/lib/validations/courses";
import { formatCents, euroToCents, centsToEuro } from "@/lib/utils/money";
import ErrorMessage from "@/components/auth/error-message";
import { Plus, Trash2 } from "lucide-react";
import { utcDateToDateTime } from "@/lib/utils/datetime-convert";

interface CourseFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    maxParticipants: number;
    location: string | null;
    acceptsAokVoucher?: boolean;
    status: "DRAFT" | "PUBLISHED" | "CANCELLED";
    category?: "AUTO" | "COURSE" | "TOPIC";
    plannedMonth?: number | null;
    plannedYear?: number | null;
    sessions?: Array<{ startAt: Date; durationMinutes: number }>;
  };
  mode: "create" | "edit";
  prefilledStartAt?: string; // datetime-local Format für Prefill
  onSaved?: () => void; // Optional: Callback nach erfolgreichem Speichern (für Modal-Modus)
  modalMode?: boolean; // Optional: Wenn true, kein Router-Push nach Speichern
}

export default function CourseForm({ initialData, mode, prefilledStartAt, onSaved, modalMode }: CourseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [priceInput, setPriceInput] = useState<string>(() => {
    if (initialData) {
      const euro = centsToEuro(initialData.priceCents);
      // Formatiere mit maximal 2 Dezimalstellen
      return euro % 1 === 0 ? euro.toString() : euro.toFixed(2);
    }
    return "";
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CourseData>({
    resolver: zodResolver(courseSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description,
          priceCents: initialData.priceCents,
          maxParticipants: initialData.maxParticipants,
          location: initialData.location || "",
          acceptsAokVoucher: initialData.acceptsAokVoucher ?? false,
          status: initialData.status,
          category: initialData.category || "AUTO",
          plannedMonth: initialData.plannedMonth || null,
          plannedYear: initialData.plannedYear || null,
          sessions: initialData.sessions && initialData.sessions.length > 0
            ? initialData.sessions.map((s) => {
                // Konvertiere UTC Date (aus DB) zu Berlin-Zeit für Anzeige
                const { date, time } = utcDateToDateTime(new Date(s.startAt));
                return {
                  date,
                  time,
                  durationMinutes: s.durationMinutes || 60,
                };
              })
            : [],
        }
      : {
          title: "",
          description: "",
          priceCents: 0,
          maxParticipants: 10,
          location: "",
          acceptsAokVoucher: false,
          status: "DRAFT",
          category: "AUTO",
          plannedMonth: null,
          plannedYear: null,
          sessions: prefilledStartAt
            ? (() => {
                // Konvertiere UTC Date zu Berlin-Zeit für Anzeige
                const { date, time } = utcDateToDateTime(new Date(prefilledStartAt));
                return [{ date, time, durationMinutes: 60 }];
              })()
            : [],
        },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sessions",
  });

  const priceCents = watch("priceCents");

  const onSubmit = async (data: CourseData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/courses" 
        : `/api/courses/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      // Sende die Sessions direkt mit date und time Feldern
      // Die API-Route kombiniert sie dann zu startAt
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Zeige detaillierte Validierungsfehler an
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details
            .map((err: any) => `${err.path.join(".")}: ${err.message}`)
            .join(", ");
          throw new Error(`Validierungsfehler: ${validationErrors}`);
        }
        // Zeige auch Details, falls vorhanden
        const errorMessage = errorData.error || "Ein Fehler ist aufgetreten";
        const details = errorData.details ? `\nDetails: ${errorData.details}` : "";
        const stack = errorData.stack ? `\n\nStack:\n${errorData.stack}` : "";
        throw new Error(`${errorMessage}${details}${stack}`);
      }

      // Im Modal-Modus: Callback aufrufen, sonst Router-Push
      if (modalMode && onSaved) {
        onSaved();
      } else {
        router.push("/admin/courses");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm("Möchtest du diesen Kurs wirklich löschen? Alle Termine und Buchungen werden ebenfalls gelöscht.")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${initialData.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Löschen fehlgeschlagen");
      }

      router.push("/admin/courses");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Fehler beim Löschen");
      setIsLoading(false);
    }
  };

  const addSession = () => {
    append({ date: "", time: "", durationMinutes: 60 });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titel *
        </label>
        <input
          {...register("title")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Baby-Yoga für Anfänger"
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
          placeholder="Beschreibung des Kurses..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Geplantes Datum (wenn noch kein genaues Datum bekannt) */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Geplantes Startdatum (optional)
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          Wenn noch kein genaues Startdatum bekannt ist, kannst du hier Monat und Jahr angeben.
          Im Frontend wird dann z.B. &quot;ab Mai 2026&quot; angezeigt.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monat
            </label>
            <select
              {...register("plannedMonth", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Kein Monat --</option>
              <option value="1">Januar</option>
              <option value="2">Februar</option>
              <option value="3">März</option>
              <option value="4">April</option>
              <option value="5">Mai</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Dezember</option>
            </select>
            {errors.plannedMonth && (
              <p className="mt-1 text-sm text-red-600">{errors.plannedMonth.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jahr
            </label>
            <input
              {...register("plannedYear", { valueAsNumber: true })}
              type="number"
              min="2020"
              max="2100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="z.B. 2026"
            />
            {errors.plannedYear && (
              <p className="mt-1 text-sm text-red-600">{errors.plannedYear.message}</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          <strong>Hinweis:</strong> Wenn du Termine mit genauen Daten angibst, werden diese verwendet.
          Das geplante Datum wird nur angezeigt, wenn keine Termine vorhanden sind.
        </p>
      </div>

      {/* Termine */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Termine (optional, wenn geplantes Datum angegeben)
          </label>
          <button
            type="button"
            onClick={addSession}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Termin hinzufügen
          </button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Datum {index + 1} *
                    </label>
                    <input
                      {...register(`sessions.${index}.date`)}
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                    {errors.sessions?.[index]?.date && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.sessions[index]?.date?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zeit {index + 1} *
                    </label>
                    <input
                      {...register(`sessions.${index}.time`)}
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                    {errors.sessions?.[index]?.time && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.sessions[index]?.time?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dauer (Minuten) *
                    </label>
                    <input
                      {...register(`sessions.${index}.durationMinutes`, { valueAsNumber: true })}
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                    {errors.sessions?.[index]?.durationMinutes && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.sessions[index]?.durationMinutes?.message}
                      </p>
                    )}
                  </div>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-8 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="Termin entfernen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {errors.sessions && (
          <p className="mt-1 text-sm text-red-600">{errors.sessions.message}</p>
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
              // Nur konvertieren, wenn ein gültiger Wert vorhanden ist
              if (value === "" || value === "." || value === ",") {
                setValue("priceCents", 0);
              } else {
                const euro = parseFloat(value.replace(",", "."));
                if (!isNaN(euro) && euro >= 0) {
                  // Konvertiere zu Cent mit präziser Berechnung
                  const cents = euroToCents(euro);
                  setValue("priceCents", cents);
                }
              }
            }}
            onBlur={(e) => {
              // Beim Verlassen des Feldes sicherstellen, dass ein gültiger Wert gesetzt ist
              const value = e.target.value;
              if (value === "" || value === "." || value === ",") {
                setPriceInput("0");
                setValue("priceCents", 0);
              } else {
                const euro = parseFloat(value.replace(",", "."));
                if (isNaN(euro) || euro < 0) {
                  setPriceInput("0");
                  setValue("priceCents", 0);
                } else {
                  // Konvertiere zu Cent und zurück zu Euro, um Rundungsfehler zu vermeiden
                  const cents = euroToCents(euro);
                  const euroRounded = centsToEuro(cents);
                  // Formatiere mit maximal 2 Dezimalstellen
                  const formatted = euroRounded % 1 === 0 
                    ? euroRounded.toString() 
                    : euroRounded.toFixed(2);
                  setPriceInput(formatted);
                  setValue("priceCents", cents);
                }
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">
            Aktuell: {formatCents(priceCents || 0)} (für den gesamten Kurs)
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
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Anzeige im Terminblock
        </label>
        <select
          id="category"
          {...register("category")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
        >
          <option value="AUTO">Automatisch (basierend auf Anzahl Termine)</option>
          <option value="COURSE">Immer als &quot;Babyzeichenkurse&quot; anzeigen</option>
          <option value="TOPIC">Immer als &quot;Themenstunden&quot; anzeigen</option>
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Bestimmt, in welchem Bereich der Kurs im Terminblock angezeigt wird.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <input
            {...register("acceptsAokVoucher")}
            type="checkbox"
            id="acceptsAokVoucher"
            className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
          />
          <label htmlFor="acceptsAokVoucher" className="ml-2 text-sm text-gray-700">
            <span className="font-medium">AOK-Gutscheine akzeptieren</span>
            <p className="text-xs text-gray-600 mt-1">
              Wenn aktiviert, können Teilnehmer bei der Anmeldung angeben, ob sie einen AOK-Gutschein haben. Der Kurs ist dann für diese Teilnehmer kostenlos.
            </p>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ort / Online-Link (optional)
        </label>
        <input
          {...register("location")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Online via Zoom oder Adresse"
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
          onClick={() => router.push("/admin/courses")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        {mode === "edit" && initialData && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Löschen
          </button>
        )}
      </div>
    </form>
  );
}
