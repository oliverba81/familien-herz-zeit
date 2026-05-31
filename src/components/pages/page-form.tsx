"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pageUpsertSchema, type PageUpsertData } from "@/lib/validations/pages";
import { slugify } from "@/lib/utils/slugify";
import ErrorMessage from "@/components/auth/error-message";
import Builder from "@/components/page-builder/builder";
import { PageContent } from "@/lib/page-builder/types";
import { normalizeContent, createDefaultContent } from "@/lib/page-builder/templates";

interface PageFormProps {
  initialData?: {
    id?: string;
    title: string;
    slug: string;
    published: boolean;
    contentJson: any;
  };
  mode: "create" | "edit";
}

const defaultContentJson = {
  blocks: [
    { type: "hero", heading: "Überschrift", subheading: "Untertitel" },
    { type: "text", text: "Dein Text…" },
    { type: "spacer", size: "md" },
  ],
};

export default function PageForm({ initialData, mode }: PageFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [builderContent, setBuilderContent] = useState<PageContent>(() => {
    if (initialData?.contentJson) {
      return normalizeContent(initialData.contentJson);
    }
    return createDefaultContent();
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PageUpsertData>({
    resolver: zodResolver(pageUpsertSchema),
    defaultValues: initialData || {
      title: "",
      slug: "",
      published: false,
      contentJson: defaultContentJson,
    },
    mode: "onChange",
  });

  const title = watch("title");
  const slug = watch("slug");

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title && mode === "create") {
      setValue("slug", slugify(title));
    }
  }, [title, autoSlug, setValue, mode]);

  const onSubmit = async (data: PageUpsertData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Nutze Builder-Content statt Textarea-Content
      const payload = {
        ...data,
        contentJson: builderContent,
      };

      const url = mode === "create" ? "/api/pages" : `/api/pages/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Ein Fehler ist aufgetreten");
        setIsLoading(false);
        return;
      }

      router.push("/admin/pages");
      router.refresh();
    } catch (err) {
      setError("Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Titel *
        </label>
        <input
          {...register("title")}
          type="text"
          id="title"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          placeholder="Seitentitel"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700"
          >
            Slug *
          </label>
          {mode === "create" && (
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoSlug}
                onChange={(e) => setAutoSlug(e.target.checked)}
                className="mr-2"
              />
              Automatisch aus Titel generieren
            </label>
          )}
        </div>
        <input
          {...register("slug")}
          type="text"
          id="slug"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          placeholder="url-freundlicher-slug"
          disabled={autoSlug && mode === "create"}
        />
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Nur Kleinbuchstaben, Zahlen und Bindestriche
        </p>
      </div>

      <div>
        <label className="flex items-center">
          <input
            {...register("published")}
            type="checkbox"
            className="mr-2 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Veröffentlicht
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seiteninhalt
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <Builder value={builderContent} onChange={setBuilderContent} />
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
          onClick={() => router.push("/admin/pages")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

