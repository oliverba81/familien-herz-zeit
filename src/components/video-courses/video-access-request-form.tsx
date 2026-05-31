"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { videoAccessRequestSchema, type VideoAccessRequestData } from "@/lib/validations/video-access";
import ErrorMessage from "@/components/auth/error-message";
import Link from "next/link";

interface VideoAccessRequestFormProps {
  courseId: string;
}

export default function VideoAccessRequestForm({ courseId }: VideoAccessRequestFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ watchUrl: string; expiresAt: string; mailSent: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VideoAccessRequestData>({
    resolver: zodResolver(videoAccessRequestSchema),
    defaultValues: {
      videoCourseId: courseId,
      email: "",
      website: "",
    },
  });

  const onSubmit = async (data: VideoAccessRequestData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/video-access/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ein Fehler ist aufgetreten");
      }

      const result = await response.json();
      setSuccess(result);
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  if (success) {
    const expiresDate = new Date(success.expiresAt);
    const expiresFormatted = expiresDate.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Zugang erfolgreich angefordert!
        </h3>
        <p className="text-green-700 mb-4">
          Ihr Zugangslink wurde erstellt. Der Link ist gültig bis zum {expiresFormatted}.
        </p>
        {success.mailSent && (
          <p className="text-sm text-green-600 mb-4 text-center">
            ✓ Wir haben Ihnen den Link auch per E-Mail geschickt.
          </p>
        )}
        <Link
          href={success.watchUrl}
          className="block w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 text-center"
        >
          Jetzt ansehen
        </Link>
        <p className="text-sm text-green-600 mt-2 text-center">
          Hinweis: Speichern Sie diesen Link, um später darauf zuzugreifen.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          E-Mail-Adresse *
        </label>
        <input
          {...register("email")}
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="ihre@email.de"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Honeypot */}
      <input
        {...register("website")}
        type="text"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Wird verarbeitet..." : "Zugang anfordern"}
      </button>
      <p className="text-center text-sm text-gray-500 mt-2">
        Sie erhalten einen Zugangslink, der 48 Stunden gültig ist.
      </p>
    </form>
  );
}

