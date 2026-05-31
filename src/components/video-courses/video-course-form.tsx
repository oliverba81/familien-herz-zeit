"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { videoCourseSchema, type VideoCourseData, prepareVideoCourseData } from "@/lib/validations/video-courses";
import { slugify } from "@/lib/utils/slugify";
import { formatCents, euroToCents, centsToEuro } from "@/lib/utils/money";
import MediaPicker from "@/components/media/media-picker";
import ErrorMessage from "@/components/auth/error-message";
import { getVideoDisplayUrl } from "@/lib/video/url-helper";

interface VideoCourseFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
    videoUrl: string;
    thumbnailUrl: string | null;
    status: "DRAFT" | "PUBLISHED";
  };
  mode: "create" | "edit";
}

export default function VideoCourseForm({ initialData, mode }: VideoCourseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!initialData?.slug);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [pickerField, setPickerField] = useState<"videoUrl" | "thumbnailUrl">("videoUrl");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoCourseData>({
    resolver: zodResolver(videoCourseSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      slug: initialData.slug,
      description: initialData.description,
      priceCents: initialData.priceCents,
      durationMinutes: initialData.durationMinutes,
      status: initialData.status,
      videoUrl: initialData.videoUrl,
      thumbnailUrl: initialData.thumbnailUrl || null,
    } : {
      title: "",
      slug: "",
      description: "",
      priceCents: 0,
      durationMinutes: 0,
      status: "DRAFT",
      videoUrl: "",
      thumbnailUrl: null,
    },
    mode: "onChange",
  });

  const title = watch("title");
  const slug = watch("slug");
  const videoUrl = watch("videoUrl");
  const thumbnailUrl = watch("thumbnailUrl");
  const priceCents = watch("priceCents");

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title && mode === "create") {
      setValue("slug", slugify(title));
    }
  }, [title, autoSlug, setValue, mode]);

  const handleOpenPicker = (type: "IMAGE" | "VIDEO", field: "videoUrl" | "thumbnailUrl") => {
    setPickerType(type);
    setPickerField(field);
    setPickerOpen(true);
  };

  const handleSelectMedia = (url: string) => {
    setValue(pickerField, url);
  };

  const onSubmit = async (data: VideoCourseData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/video-courses" 
        : `/api/video-courses/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const preparedData = prepareVideoCourseData(data);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preparedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ein Fehler ist aufgetreten");
      }

      router.push("/admin/video-courses");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm("Möchten Sie diesen Videokurs wirklich löschen?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/video-courses/${initialData.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Löschen fehlgeschlagen");
      }

      router.push("/admin/video-courses");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Fehler beim Löschen");
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
          {...register("title")}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="z.B. React für Anfänger"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="react-fuer-anfaenger"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beschreibung *
        </label>
        <textarea
          {...register("description")}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          placeholder="Beschreibung des Videokurses..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preis (in Euro) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={centsToEuro(priceCents || 0)}
            onChange={(e) => {
              const euro = parseFloat(e.target.value) || 0;
              setValue("priceCents", euroToCents(euro));
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">
            Aktuell: {formatCents(priceCents || 0)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dauer (Minuten) *
          </label>
          <input
            {...register("durationMinutes", { valueAsNumber: true })}
            type="number"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            placeholder="60"
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-600">{errors.durationMinutes.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video-URL *
        </label>
        <div className="flex gap-2">
          <input
            {...register("videoUrl")}
            type="text"
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="/uploads/videos/..."
          />
          <button
            type="button"
            onClick={() => handleOpenPicker("VIDEO", "videoUrl")}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
          >
            Video auswählen
          </button>
        </div>
        {errors.videoUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.videoUrl.message}</p>
        )}
        {videoUrl && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
            <video
              src={getVideoDisplayUrl(videoUrl)}
              className="w-full max-h-48 bg-gray-50"
              controls
              preload="metadata"
            >
              Ihr Browser unterstützt das Video-Element nicht.
            </video>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thumbnail-URL (optional)
        </label>
        <div className="flex gap-2">
          <input
            {...register("thumbnailUrl")}
            type="text"
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="/uploads/images/..."
          />
          <button
            type="button"
            onClick={() => handleOpenPicker("IMAGE", "thumbnailUrl")}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 whitespace-nowrap"
          >
            Thumbnail auswählen
          </button>
        </div>
        {thumbnailUrl && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="w-full max-h-48 object-contain bg-gray-50"
            />
          </div>
        )}
      </div>

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
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
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
          onClick={() => router.push("/admin/video-courses")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        {mode === "edit" && initialData && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Löschen
          </button>
        )}
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type={pickerType}
        onSelect={handleSelectMedia}
      />
    </form>
  );
}

