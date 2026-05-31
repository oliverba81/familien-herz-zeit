"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageForm from "@/components/pages/page-form";

interface PageFormClientProps {
  initialData: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    showTitle?: boolean;
    containerWidth?: string;
    customCss?: string | null;
    contentJson: any;
    draftContentJson?: any;
    previewToken?: string | null;
  };
}

export default function PageFormClient({ initialData }: PageFormClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Möchten Sie diese Seite wirklich löschen?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/pages/${initialData.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Fehler beim Löschen");
        setIsDeleting(false);
        return;
      }

      router.push("/admin/pages");
      router.refresh();
    } catch (err) {
      alert("Fehler beim Löschen");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageForm initialData={initialData} mode="edit" />
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Gefahrenzone
        </h2>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Wird gelöscht..." : "Seite löschen"}
        </button>
      </div>
    </div>
  );
}

