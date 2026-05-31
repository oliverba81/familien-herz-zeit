"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  waitlistEntrySchema,
  type WaitlistEntryData,
} from "@/lib/validations/waitlist";

interface CourseOption {
  id: string;
  title: string;
}

interface WaitlistFormInitialData {
  id: string;
  courseId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  childFirstName: string | null;
  childLastName: string | null;
  childBirthDate: Date | null;
  childNotes: string | null;
  interestLabel: string | null;
  notes: string | null;
}

interface WaitlistFormProps {
  mode: "create" | "edit";
  courses: CourseOption[];
  initialData?: WaitlistFormInitialData;
}

type FormValues = WaitlistEntryData & {
  childBirthDate?: string | null;
};

function formatDateInput(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WaitlistForm({
  mode,
  courses,
  initialData,
}: WaitlistFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(waitlistEntrySchema),
    defaultValues: {
      courseId: initialData?.courseId || undefined,
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      childFirstName: initialData?.childFirstName || "",
      childLastName: initialData?.childLastName || "",
      childBirthDate: formatDateInput(initialData?.childBirthDate || null),
      childNotes: initialData?.childNotes || "",
      interestLabel: initialData?.interestLabel || "",
      notes: initialData?.notes || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);

    // Normalisiere optionale Felder
    const payload: any = {
      ...values,
      courseId: values.courseId || null,
      phone: values.phone || null,
      childFirstName: values.childFirstName || null,
      childLastName: values.childLastName || null,
      childBirthDate: values.childBirthDate || null,
      childNotes: values.childNotes || null,
      interestLabel: values.interestLabel || null,
      notes: values.notes || null,
    };

    try {
      const url =
        mode === "create"
          ? "/api/admin/waitlist"
          : `/api/admin/waitlist/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.details?.formErrors?.join(", ") ||
          errorData?.error ||
          "Fehler beim Speichern";
        throw new Error(message);
      }

      await response.json();
      router.push("/admin/waitlist");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorname *
            </label>
            <input
              type="text"
              {...register("firstName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nachname *
            </label>
            <input
              type="text"
              {...register("lastName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail *
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              {...register("phone")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kind – Vorname
            </label>
            <input
              type="text"
              {...register("childFirstName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kind – Nachname
            </label>
            <input
              type="text"
              {...register("childLastName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Geburtsdatum des Kindes
            </label>
            <input
              type="date"
              {...register("childBirthDate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.childBirthDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.childBirthDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kind – Besonderheiten / Notizen
            </label>
            <textarea
              rows={3}
              {...register("childNotes")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kurs (optional)
            </label>
            <select
              {...register("courseId")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Kein Kurs ausgewählt</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Freitext-Interesse (z. B. „Babykurs März“)
            </label>
            <input
              type="text"
              {...register("interestLabel")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interne Notizen
          </label>
          <textarea
            rows={4}
            {...register("notes")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/waitlist")}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          disabled={loading}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
        >
          {mode === "create" ? "Eintrag anlegen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}

