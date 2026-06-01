"use client";

import { useFieldArray, Control, UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { BuilderFormValues } from "./feedback-form-builder";

interface Props {
  nestIndex: number;
  control: Control<BuilderFormValues>;
  register: UseFormRegister<BuilderFormValues>;
}

export default function FeedbackQuestionOptions({
  nestIndex,
  control,
  register,
}: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${nestIndex}.options`,
  });

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-medium text-gray-600">
        Antwortoptionen
      </label>
      {fields.map((field, optIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <input
            {...register(`questions.${nestIndex}.options.${optIndex}.label`)}
            type="text"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
            placeholder={`Option ${optIndex + 1}`}
          />
          <button
            type="button"
            onClick={() => remove(optIndex)}
            disabled={fields.length <= 1}
            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Option entfernen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          append({ id: crypto.randomUUID(), label: "" })
        }
        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Option hinzufügen
      </button>
    </div>
  );
}
