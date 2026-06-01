"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeedbackRowActionsProps {
  formId: string;
  shareToken: string;
}

export default function FeedbackRowActions({
  formId,
  shareToken,
}: FeedbackRowActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDuplicate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${formId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kopieren fehlgeschlagen.");
        setIsLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Feedbackbogen wirklich löschen? Alle abgegebenen Antworten werden ebenfalls gelöscht."
      )
    ) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${formId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Löschen fehlgeschlagen.");
        setIsLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/feedback/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {error && (
        <span
          className="text-xs text-red-600 mr-1 max-w-[120px] truncate"
          title={error}
        >
          {error}
        </span>
      )}
      <Link
        href={`/admin/feedback/${formId}/results`}
        className="text-green-600 hover:text-green-800 transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-green-50 text-sm"
      >
        Auswerten
      </Link>
      <Link
        href={`/admin/feedback/${formId}`}
        className="text-rose-500 hover:text-rose-700 transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-rose-50 text-sm"
      >
        Bearbeiten
      </Link>
      <button
        type="button"
        onClick={handleCopyLink}
        className="text-gray-600 hover:text-gray-800 transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-gray-100 text-sm"
      >
        {copied ? "Kopiert!" : "Link kopieren"}
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isLoading}
        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-blue-50 text-sm"
      >
        {isLoading ? "..." : "Kopieren"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isLoading}
        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold inline-block px-3 py-1 rounded hover:bg-red-50 text-sm"
      >
        Löschen
      </button>
    </div>
  );
}
