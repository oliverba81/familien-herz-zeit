"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PageRowActionsProps {
  pageId: string;
  slug: string;
  isStartPage: boolean;
}

export default function PageRowActions({ pageId, slug, isStartPage }: PageRowActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [homepageLoading, setHomepageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetHomepage = async () => {
    setHomepageLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Startseite konnte nicht gesetzt werden.");
        setHomepageLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
    }
    setHomepageLoading(false);
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Seite konnte nicht dupliziert werden.");
        setIsLoading(false);
        return;
      }

      const newPage = await response.json();
      router.push(`/admin/pages/${newPage.id}`);
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {error && (
        <span className="text-xs text-red-600 mr-1 max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      {!isStartPage && (
        <button
          type="button"
          onClick={handleSetHomepage}
          disabled={homepageLoading}
          className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-green-50 text-sm"
        >
          {homepageLoading ? "Wird gesetzt…" : "Als Startseite"}
        </button>
      )}
      <Link
        href={`/admin/pages/${pageId}`}
        className="text-rose-500 hover:text-rose-700 transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-rose-50"
      >
        Bearbeiten
      </Link>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isLoading}
        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-blue-50 text-sm"
      >
        {isLoading ? "Wird dupliziert…" : "Duplizieren"}
      </button>
    </div>
  );
}
