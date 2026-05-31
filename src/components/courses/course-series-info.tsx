"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CourseSeriesInfoProps {
  courseId: string;
  series: {
    id: string;
    title: string;
  };
}

export default function CourseSeriesInfo({ courseId, series }: CourseSeriesInfoProps) {
  const router = useRouter();
  const [isDetaching, setIsDetaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetach = async () => {
    if (!confirm("Möchten Sie diesen Kurs wirklich von der Serie abkoppeln? Er wird danach nicht mehr automatisch synchronisiert.")) {
      return;
    }

    setIsDetaching(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/detach`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Abkoppeln");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsDetaching(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 text-lg">🌿</span>
            <h3 className="text-sm font-semibold text-blue-900">
              Teil einer Terminserie
            </h3>
          </div>
          <p className="text-sm text-blue-700 mb-2">
            Dieser Termin gehört zur Serie:{" "}
            <Link
              href={`/admin/course-series/${series.id}`}
              className="font-semibold text-blue-800 hover:text-blue-900 underline"
            >
              {series.title}
            </Link>
          </p>
          <p className="text-xs text-blue-600">
            Änderungen an der Serie werden automatisch auf diesen Termin angewendet (wenn keine Buchungen vorhanden sind).
          </p>
        </div>
        <button
          onClick={handleDetach}
          disabled={isDetaching}
          className="ml-4 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDetaching ? "Wird abgekoppelt..." : "Abkoppeln"}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

