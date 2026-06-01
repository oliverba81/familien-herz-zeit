"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import ErrorMessage from "@/components/auth/error-message";
import type {
  FeedbackQuestion,
  FeedbackQuestionType,
} from "@/lib/feedback/types";
import FeedbackQuestionOptions from "./feedback-question-options";

export interface BuilderOption {
  id: string;
  label: string;
}

export interface BuilderQuestion {
  id: string;
  type: FeedbackQuestionType;
  label: string;
  required: boolean;
  options: BuilderOption[];
}

export interface BuilderFormValues {
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  collectName: boolean;
  collectEmail: boolean;
  questions: BuilderQuestion[];
}

interface Props {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    description: string | null;
    status: "DRAFT" | "PUBLISHED";
    collectName: boolean;
    collectEmail: boolean;
    questions: FeedbackQuestion[];
  };
}

const QUESTION_TYPE_LABELS: Record<FeedbackQuestionType, string> = {
  SINGLE_CHOICE: "Einfachauswahl (eine Antwort)",
  MULTI_CHOICE: "Mehrfachauswahl (mehrere Antworten)",
  FREE_TEXT: "Freitext",
  RATING: "Bewertung (1–5 Sterne)",
};

function toBuilderQuestion(q: FeedbackQuestion): BuilderQuestion {
  return {
    id: q.id,
    type: q.type,
    label: q.label,
    required: q.required,
    options:
      q.type === "SINGLE_CHOICE" || q.type === "MULTI_CHOICE"
        ? q.options
        : [],
  };
}

/** Baut die saubere Payload: Optionen nur für Choice-Typen. */
function toPayloadQuestions(questions: BuilderQuestion[]): FeedbackQuestion[] {
  return questions.map((q) => {
    if (q.type === "SINGLE_CHOICE" || q.type === "MULTI_CHOICE") {
      return {
        id: q.id,
        type: q.type,
        label: q.label,
        required: q.required,
        options: q.options,
      };
    }
    return {
      id: q.id,
      type: q.type,
      label: q.label,
      required: q.required,
    };
  });
}

function newQuestion(type: FeedbackQuestionType): BuilderQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    label: "",
    required: false,
    options:
      type === "SINGLE_CHOICE" || type === "MULTI_CHOICE"
        ? [{ id: crypto.randomUUID(), label: "" }]
        : [],
  };
}

export default function FeedbackFormBuilder({ mode, initialData }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<BuilderFormValues>({
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description ?? "",
          status: initialData.status,
          collectName: initialData.collectName,
          collectEmail: initialData.collectEmail,
          questions: initialData.questions.map(toBuilderQuestion),
        }
      : {
          title: "",
          description: "",
          status: "DRAFT",
          collectName: false,
          collectEmail: false,
          questions: [],
        },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "questions",
  });

  const onSubmit = async (data: BuilderFormValues) => {
    setIsLoading(true);
    setError(null);

    if (data.questions.length === 0) {
      setError("Bitte mindestens eine Frage hinzufügen.");
      setIsLoading(false);
      return;
    }

    const payload = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      collectName: data.collectName,
      collectEmail: data.collectEmail,
      questions: toPayloadQuestions(data.questions),
    };

    try {
      const url =
        mode === "create"
          ? "/api/feedback"
          : `/api/feedback/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.details && Array.isArray(errData.details)) {
          const msg = errData.details
            .map((e: any) => e.message)
            .join(", ");
          throw new Error(msg || "Validierungsfehler");
        }
        throw new Error(errData.error || "Speichern fehlgeschlagen");
      }

      router.push("/admin/feedback");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titel *
        </label>
        <input
          {...register("title", { required: "Titel ist erforderlich" })}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. Kursfeedback Babyzeichen"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beschreibung (optional)
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="Kurzer Hinweis für die Teilnehmer..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </select>
        </div>
        <div className="flex items-center gap-2 mt-7">
          <input
            {...register("collectName")}
            type="checkbox"
            id="collectName"
            className="h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
          />
          <label htmlFor="collectName" className="text-sm text-gray-700">
            Name abfragen
          </label>
        </div>
        <div className="flex items-center gap-2 mt-7">
          <input
            {...register("collectEmail")}
            type="checkbox"
            id="collectEmail"
            className="h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
          />
          <label htmlFor="collectEmail" className="text-sm text-gray-700">
            E-Mail abfragen
          </label>
        </div>
      </div>

      {(watch("collectName") || watch("collectEmail")) && (
        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          Da personenbezogene Daten erfasst werden, muss der Teilnehmer der
          Datenverarbeitung zustimmen (wird im öffentlichen Formular automatisch
          verlangt).
        </p>
      )}

      {/* Fragen */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Fragen
          </label>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-gray-500 mb-4">Noch keine Fragen.</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const type = watch(`questions.${index}.type`);
            const isChoice =
              type === "SINGLE_CHOICE" || type === "MULTI_CHOICE";
            return (
              <div
                key={field.id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Fragetext *
                        </label>
                        <input
                          {...register(`questions.${index}.label`, {
                            required: "Fragetext erforderlich",
                          })}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                          placeholder="Ihre Frage..."
                        />
                        {errors.questions?.[index]?.label && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.questions[index]?.label?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Typ
                        </label>
                        <select
                          value={type}
                          onChange={(e) => {
                            const newType = e.target
                              .value as FeedbackQuestionType;
                            setValue(`questions.${index}.type`, newType);
                            const isNewChoice =
                              newType === "SINGLE_CHOICE" ||
                              newType === "MULTI_CHOICE";
                            const current = getValues(
                              `questions.${index}.options`
                            );
                            if (isNewChoice && (!current || current.length === 0)) {
                              setValue(`questions.${index}.options`, [
                                { id: crypto.randomUUID(), label: "" },
                              ]);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                        >
                          {(
                            Object.keys(
                              QUESTION_TYPE_LABELS
                            ) as FeedbackQuestionType[]
                          ).map((t) => (
                            <option key={t} value={t}>
                              {QUESTION_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isChoice && (
                      <FeedbackQuestionOptions
                        nestIndex={index}
                        control={control}
                        register={register}
                      />
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        {...register(`questions.${index}.required`)}
                        type="checkbox"
                        id={`required-${index}`}
                        className="h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`required-${index}`}
                        className="text-xs text-gray-700"
                      >
                        Pflichtfrage
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => index > 0 && swap(index, index - 1)}
                      disabled={index === 0}
                      className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach oben"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < fields.length - 1 && swap(index, index + 1)
                      }
                      disabled={index === fields.length - 1}
                      className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach unten"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Frage entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => append(newQuestion("SINGLE_CHOICE"))}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Frage hinzufügen
          </button>
        </div>
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
          onClick={() => router.push("/admin/feedback")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
