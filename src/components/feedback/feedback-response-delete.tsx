"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  responseId: string;
}

export default function FeedbackResponseDelete({ responseId }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Diese einzelne Antwort wirklich löschen?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/feedback/responses/${responseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
        return;
      }
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isLoading}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
    >
      {isLoading ? "..." : "Löschen"}
    </button>
  );
}
