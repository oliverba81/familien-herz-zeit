"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pageUpsertSchema, type PageUpsertData } from "@/lib/validations/pages";
import { slugify } from "@/lib/utils/slugify";
import ErrorMessage from "@/components/auth/error-message";
import { extractTextFromContentForAI } from "@/lib/seo/meta";
import SeoPreview from "@/components/seo/seo-preview";

interface PageFormProps {
  initialData?: {
    id?: string;
    title: string;
    slug: string;
    published: boolean;
    showTitle?: boolean;
    containerWidth?: string;
    customCss?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    ogImageUrl?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contentJson?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draftContentJson?: any;
    previewToken?: string | null;
  };
  mode: "create" | "edit";
}

/** Leerer Puck-Inhalt für neue Seiten (Inhalt wird danach im Visual-Builder bearbeitet). */
const EMPTY_PUCK_CONTENT = { version: 3, root: { props: {} }, content: [] };

const card = "bg-white border border-gray-200 rounded-xl p-5 shadow-sm";
const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
const hintCls = "mt-1 text-xs text-gray-500";

export default function PageForm({ initialData, mode }: PageFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(mode === "create");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PageUpsertData>({
    resolver: zodResolver(pageUpsertSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      published: initialData?.published || false,
      showTitle: initialData?.showTitle !== undefined ? initialData.showTitle : true,
      containerWidth:
        (initialData?.containerWidth as "narrow" | "full" | "medium" | "wide" | undefined) ||
        "medium",
      customCss: initialData?.customCss || "",
      metaDescription: initialData?.metaDescription ?? "",
      metaKeywords: initialData?.metaKeywords ?? "",
      ogImageUrl: initialData?.ogImageUrl ?? "",
    },
    mode: "onChange",
  });

  const title = watch("title");
  const slug = watch("slug");

  // Slug automatisch aus Titel (nur beim Erstellen).
  useEffect(() => {
    if (autoSlug && title && mode === "create" && initialData?.slug !== "home") {
      setValue("slug", slugify(title));
    }
  }, [title, autoSlug, setValue, mode, initialData?.slug]);

  const onSubmit = async (data: PageUpsertData) => {
    setIsLoading(true);
    setError(null);
    try {
      const basePayload = {
        ...data,
        showTitle: typeof data.showTitle === "boolean" ? data.showTitle : true,
        containerWidth: data.containerWidth || "medium",
      };

      if (mode === "create") {
        // Neue Seite: nur Einstellungen + leerer Inhalt; danach im Visual-Builder bearbeiten.
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, contentJson: EMPTY_PUCK_CONTENT }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Ein Fehler ist aufgetreten");
          setIsLoading(false);
          return;
        }
        const created = await res.json().catch(() => null);
        const newId = created?.id ?? created?.page?.id;
        router.push(newId ? `/admin/pages/${newId}/puck` : "/admin/pages");
        router.refresh();
        return;
      }

      // Bearbeiten: NUR Einstellungen speichern (kein Inhalt → bestehender Inhalt bleibt unangetastet).
      const res = await fetch(`/api/pages/${initialData?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || err.message || "Ein Fehler ist aufgetreten");
        setIsLoading(false);
        return;
      }
      router.push("/admin/pages");
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten");
      setIsLoading(false);
    }
  };

  const generateSeo = async () => {
    setSeoError(null);
    setSeoGenerating(true);
    try {
      let contentSummary: string | undefined;
      let contentHtml: string | undefined;
      // Inhalt der Seite für den KI-Kontext laden (Edit-Modus).
      if (mode === "edit" && initialData?.id) {
        const r = await fetch(`/api/pages/${initialData.id}`);
        if (r.ok) {
          const p = await r.json();
          const content = p.draftContentJson ?? p.contentJson;
          contentSummary = extractTextFromContentForAI(content, 12000) || undefined;
          if (content?.version === 2 && typeof content.html === "string") contentHtml = content.html;
        }
      }
      const res = await fetch("/api/generate-page-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: watch("title") || "Seite",
          contentSummary,
          contentHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSeoError(data.error || "Fehler beim Generieren");
        return;
      }
      if (data.metaDescription) setValue("metaDescription", data.metaDescription);
      if (data.metaKeywords) setValue("metaKeywords", data.metaKeywords);
    } catch {
      setSeoError("Fehler beim Generieren");
    } finally {
      setSeoGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {error && <ErrorMessage message={error} />}

      {/* Inhalt: Verweis auf den Visual-Builder statt eingebetteter Editoren */}
      <div className={`${card} bg-gradient-to-br from-violet-50 to-rose-50`}>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Inhalt</h2>
        {mode === "edit" && initialData?.id ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Der Seiteninhalt wird im Visual-Builder bearbeitet — dort gestaltest du die Seite
              1:1 wie im echten Leben.
            </p>
            <Link
              href={`/admin/pages/${initialData.id}/puck`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700"
            >
              ✨ Inhalt im Visual-Builder bearbeiten
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Speichere die Seite zuerst — danach öffnet sich der Visual-Builder, um den Inhalt zu
            gestalten.
          </p>
        )}
      </div>

      {/* Grunddaten */}
      <div className={`${card} space-y-4`}>
        <h2 className="text-base font-semibold text-gray-900">Grunddaten</h2>

        <div>
          <label htmlFor="title" className={labelCls}>
            Titel *
          </label>
          <input {...register("title")} type="text" id="title" className={inputCls} placeholder="Seitentitel" />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="slug" className="text-sm font-medium text-gray-700">
              Slug *
            </label>
            {mode === "create" && initialData?.slug !== "home" && (
              <label className="flex items-center text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="mr-2"
                />
                Automatisch aus Titel
              </label>
            )}
          </div>
          <input
            {...register("slug")}
            type="text"
            id="slug"
            className={`${inputCls} ${initialData?.slug === "home" ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="url-freundlicher-slug"
            disabled={(autoSlug && mode === "create") || initialData?.slug === "home"}
            readOnly={initialData?.slug === "home"}
          />
          {initialData?.slug === "home" && (
            <p className={hintCls}>Der Slug &quot;home&quot; ist für die Startseite reserviert.</p>
          )}
          {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
          <p className={hintCls}>Nur Kleinbuchstaben, Zahlen und Bindestriche.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select
              {...register("published", { setValueAs: (v) => v === "true" || v === true })}
              value={watch("published") ? "true" : "false"}
              onChange={(e) => setValue("published", e.target.value === "true")}
              className={inputCls}
            >
              <option value="false">Entwurf</option>
              <option value="true">Veröffentlicht</option>
            </select>
            <p className={hintCls}>Bestimmt, ob die Seite öffentlich sichtbar ist.</p>
          </div>
          <div>
            <label className={labelCls}>Container-Breite</label>
            <select {...register("containerWidth")} className={inputCls}>
              <option value="full">Volle Breite</option>
              <option value="wide">Breit (max-w-7xl)</option>
              <option value="medium">Mittel (max-w-4xl) — Standard</option>
              <option value="narrow">Schmal (max-w-2xl)</option>
            </select>
            <p className={hintCls}>Maximale Breite des Seiteninhalts.</p>
          </div>
        </div>

        <label className="flex items-start gap-2">
          <input
            {...register("showTitle")}
            type="checkbox"
            className="mt-1 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
          />
          <span>
            <span className="text-sm font-medium text-gray-700">Titel auf der Seite anzeigen</span>
            <span className="block text-xs text-gray-500">
              Wenn deaktiviert, erscheint der Titel nur in Navigation/Browser-Tab.
            </span>
          </span>
        </label>
      </div>

      {/* SEO (aufklappbar) */}
      <details className={card} open>
        <summary className="cursor-pointer text-base font-semibold text-gray-900">
          Suchmaschinen & KI (SEO)
        </summary>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={seoGenerating}
              onClick={generateSeo}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:opacity-50"
            >
              {seoGenerating ? "Wird generiert…" : "Mit KI ausfüllen"}
            </button>
            {seoError && <span className="text-sm text-red-600">{seoError}</span>}
          </div>

          <div>
            <label htmlFor="metaDescription" className={labelCls}>
              Meta-Beschreibung
            </label>
            <textarea
              {...register("metaDescription")}
              id="metaDescription"
              rows={3}
              className={`${inputCls} text-sm`}
              placeholder="Kurzbeschreibung für Suchmaschinen (empfohlen 120–158 Zeichen)"
            />
          </div>
          <div>
            <label htmlFor="metaKeywords" className={labelCls}>
              Meta-Keywords
            </label>
            <input
              {...register("metaKeywords")}
              type="text"
              id="metaKeywords"
              className={`${inputCls} text-sm`}
              placeholder="Stichwörter, komma-getrennt (optional)"
            />
          </div>
          <div>
            <label htmlFor="ogImageUrl" className={labelCls}>
              OG-Bild-URL
            </label>
            <input
              {...register("ogImageUrl")}
              type="text"
              id="ogImageUrl"
              className={`${inputCls} text-sm`}
              placeholder="Bild-URL für Vorschau (optional). Ideal: 1200×630 px"
            />
          </div>
          <div className="pt-2 border-t border-gray-200">
            <SeoPreview
              title={watch("title") || ""}
              description={watch("metaDescription") || ""}
              slug={slug || ""}
              ogImageUrl={watch("ogImageUrl") || null}
            />
          </div>
        </div>
      </details>

      {/* Erweitert: Custom CSS (aufklappbar) */}
      <details className={card}>
        <summary className="cursor-pointer text-base font-semibold text-gray-900">
          Erweitert: Custom CSS
        </summary>
        <div className="mt-4">
          <textarea
            {...register("customCss")}
            id="customCss"
            rows={8}
            className={`${inputCls} font-mono text-sm`}
            placeholder={"/* Dein Custom CSS hier */\n.meine-klasse {\n  color: red;\n}"}
          />
          <p className={hintCls}>
            CSS, das nur für diese Seite gilt. Wird in einem &lt;style&gt;-Tag eingefügt.
          </p>
        </div>
      </details>

      {/* Aktionen */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {isLoading
            ? "Wird gespeichert…"
            : mode === "create"
              ? "Erstellen & Inhalt bearbeiten"
              : "Einstellungen speichern"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/pages")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
