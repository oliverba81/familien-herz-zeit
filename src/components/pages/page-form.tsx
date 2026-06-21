"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pageUpsertSchema, type PageUpsertData } from "@/lib/validations/pages";
import { slugify } from "@/lib/utils/slugify";
import ErrorMessage from "@/components/auth/error-message";
import Builder from "@/components/page-builder/builder";
import PageBuilderShell from "@/components/page-builder/page-builder-shell";
import PageBuilderV2Shell from "@/components/page-builder/page-builder-v2-shell";
import { PageContentV1, PageContentV2, isPageContentV2, createEmptyContent } from "@/lib/page-builder/schema";
import { normalizeContent, createDefaultContent } from "@/lib/page-builder/templates";
import { convertV1ToV2Html } from "@/lib/page-builder/v1-to-v2-html";
import { extractTextFromContentForAI } from "@/lib/seo/meta";

type BuilderContent = PageContentV1 | PageContentV2;

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
    contentJson: any;
    draftContentJson?: any;
    previewToken?: string | null;
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
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  /** Im WYSIWYG-Modus: aktueller Editor-HTML für KI-Kontext (wird von PageBuilderV2Shell gesetzt). */
  const v2CurrentHtmlRef = useRef<(() => string) | null>(null);
  const contentToUse = initialData?.draftContentJson ?? initialData?.contentJson;
  const [builderMode, setBuilderMode] = useState<"v1" | "v2">(() => {
    if (initialData?.id && contentToUse && isPageContentV2(contentToUse)) return "v2";
    return "v1";
  });
  const [builderContent, setBuilderContent] = useState<BuilderContent>(() => {
    if (contentToUse && isPageContentV2(contentToUse)) return contentToUse;
    if (contentToUse) return normalizeContent(contentToUse);
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
    defaultValues: initialData ? {
      title: initialData.title || "",
      slug: initialData.slug || "",
      published: initialData.published || false,
      showTitle: initialData.showTitle !== undefined ? initialData.showTitle : true,
      containerWidth: (initialData.containerWidth as "narrow" | "full" | "medium" | "wide" | undefined) || "medium",
      customCss: initialData.customCss || "",
      metaDescription: initialData.metaDescription ?? "",
      metaKeywords: initialData.metaKeywords ?? "",
      ogImageUrl: initialData.ogImageUrl ?? "",
      contentJson: initialData.contentJson || defaultContentJson,
    } : {
      title: "",
      slug: "",
      published: false,
      showTitle: true,
      containerWidth: "medium",
      customCss: "",
      metaDescription: "",
      metaKeywords: "",
      ogImageUrl: "",
      contentJson: defaultContentJson,
    },
    mode: "onChange",
  });

  const title = watch("title");
  const slug = watch("slug");

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title && mode === "create") {
      // Wenn initialData slug "home" hat, behalte es
      if (initialData?.slug === "home") {
        setValue("slug", "home");
        setAutoSlug(false); // Deaktiviere Auto-Slug für Startseite
      } else if (!initialData?.slug) {
        // Nur generieren wenn kein initial slug vorhanden
        setValue("slug", slugify(title));
      }
    }
  }, [title, autoSlug, setValue, mode, initialData]);

  // Setze initial slug wenn vorhanden
  useEffect(() => {
    if (initialData?.slug && mode === "create") {
      setValue("slug", initialData.slug);
      if (initialData.slug === "home") {
        setAutoSlug(false);
      }
    }
  }, [initialData?.slug, setValue, mode]);

  const onSubmit = async (data: PageUpsertData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Nutze Builder-Content statt Textarea-Content
      // Stelle sicher, dass showTitle immer ein Boolean ist
      // Stelle sicher, dass containerWidth immer gesetzt ist
      const payload = {
        ...data,
        showTitle: typeof data.showTitle === "boolean" ? data.showTitle : true,
        containerWidth: data.containerWidth || "medium",
        contentJson: builderContent as any,
      };
      
      console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

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
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent ${
            initialData?.slug === "home" ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
          placeholder="url-freundlicher-slug"
          disabled={(autoSlug && mode === "create") || initialData?.slug === "home"}
          readOnly={initialData?.slug === "home"}
        />
        {initialData?.slug === "home" && (
          <p className="mt-1 text-xs text-gray-500">
            Der Slug &quot;home&quot; ist für die Startseite reserviert und kann nicht geändert werden.
          </p>
        )}
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Nur Kleinbuchstaben, Zahlen und Bindestriche
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          {...register("published", {
            setValueAs: (value) => value === "true" || value === true,
          })}
          value={watch("published") ? "true" : "false"}
          onChange={(e) => {
            setValue("published", e.target.value === "true");
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        >
          <option value="false">Entwurf</option>
          <option value="true">Veröffentlicht</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Bestimmt, ob die Seite öffentlich sichtbar ist.
        </p>
      </div>

      <div>
        <label className="flex items-center">
          <input
            {...register("showTitle")}
            type="checkbox"
            className="mr-2 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Titel auf der Seite anzeigen
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Wenn deaktiviert, wird der Titel nur in der Navigation und im Browser-Tab angezeigt, nicht auf der Seite selbst.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Container-Breite
        </label>
        <select
          {...register("containerWidth")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        >
          <option value="full">Volle Breite (keine Begrenzung)</option>
          <option value="wide">Breit (max-w-7xl)</option>
          <option value="medium">Mittel (max-w-4xl) - Standard</option>
          <option value="narrow">Schmal (max-w-2xl)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Bestimmt die maximale Breite des Seiteninhalts.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Suchmaschinen & KI</h3>
        <p className="text-xs text-gray-600 mb-3">
          Diese Angaben verbessern die Auffindbarkeit in Suchmaschinen und bei KI.
        </p>
        <button
          type="button"
          disabled={seoGenerating}
          onClick={async () => {
            setSeoError(null);
            setSeoGenerating(true);
            try {
              const title = watch("title");
              // Im WYSIWYG-Modus: aktuellen HTML aus Editor (Ref) oder Fallback auf gespeichertes builderContent
              const v2Html =
                builderMode === "v2" && v2CurrentHtmlRef.current
                  ? v2CurrentHtmlRef.current()
                  : builderMode === "v2" && isPageContentV2(builderContent)
                    ? builderContent.html
                    : "";
              const contentForAI =
                builderMode === "v2" && v2Html !== ""
                  ? { version: 2 as const, html: v2Html }
                  : builderContent;
              const contentSummary = extractTextFromContentForAI(contentForAI, 12000);
              const rawHtml = builderMode === "v2" && v2Html !== "" ? v2Html : undefined;
              const res = await fetch("/api/generate-page-seo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: title || "Seite",
                  contentSummary: contentSummary || undefined,
                  contentHtml: rawHtml || undefined,
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
          }}
          className="mb-3 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:opacity-50"
        >
          {seoGenerating ? "Wird generiert…" : "Mit KI ausfüllen"}
        </button>
        {seoError && <p className="text-sm text-red-600 mb-2">{seoError}</p>}
        <p className="text-xs text-gray-500 mb-3">OG-Bild muss ggf. manuell gewählt werden.</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Meta-Beschreibung
            </label>
            <textarea
              {...register("metaDescription")}
              id="metaDescription"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              placeholder="Kurzbeschreibung für Suchmaschinen (empfohlen 120–158 Zeichen für Anzeige auf allen Geräten)"
            />
          </div>
          <div>
            <label htmlFor="metaKeywords" className="block text-sm font-medium text-gray-700 mb-1">
              Meta-Keywords
            </label>
            <input
              {...register("metaKeywords")}
              type="text"
              id="metaKeywords"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              placeholder="Stichwörter, komma-getrennt (optional – von Google nicht für Ranking genutzt, kann für andere Dienste/KI hilfreich sein)"
            />
          </div>
          <div>
            <label htmlFor="ogImageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              OG-Bild-URL
            </label>
            <input
              {...register("ogImageUrl")}
              type="text"
              id="ogImageUrl"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
              placeholder="Bild-URL für Vorschau (optional). Ideal: 1200×630 px, unter 150 KB"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="customCss"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Custom CSS
        </label>
        <textarea
          {...register("customCss")}
          id="customCss"
          rows={10}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
          placeholder="/* Dein Custom CSS hier */&#10;.meine-klasse {&#10;  color: red;&#10;}"
        />
        <p className="mt-1 text-xs text-gray-500">
          CSS-Code, der nur für diese Seite gelten soll. Wird in einem &lt;style&gt; Tag eingefügt.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seiteninhalt
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setBuilderMode("v1")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              builderMode === "v1"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Block-Builder
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isPageContentV2(builderContent)) {
                setBuilderContent({ version: 2, html: "" });
              }
              setBuilderMode("v2");
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              builderMode === "v2"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            WYSIWYG-Builder
          </button>
          {builderMode === "v1" && !isPageContentV2(builderContent) && (builderContent as PageContentV1).blocks?.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const html = convertV1ToV2Html(builderContent as PageContentV1);
                setBuilderContent({ version: 2, html });
                setBuilderMode("v2");
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
            >
              In WYSIWYG übernehmen
            </button>
          )}
        </div>
        {builderMode === "v1" && isPageContentV2(builderContent) && initialData?.id && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
            Diese Seite enthält WYSIWYG-Inhalt. Im Block-Builder wird nur V1-Inhalt angezeigt; beim Speichern würde der WYSIWYG-Inhalt überschrieben.
          </p>
        )}
        {builderMode === "v1" ? (
          initialData?.id ? (
            <PageBuilderShell
              pageId={initialData.id}
              initialContentJson={
                isPageContentV2(builderContent) ? createEmptyContent() : (builderContent as PageContentV1)
              }
              pageSlug={initialData.slug}
              pagePublished={initialData.published}
              additionalFields={{
                published: watch("published"),
                showTitle: watch("showTitle"),
                containerWidth: watch("containerWidth"),
                customCss: watch("customCss"),
                metaDescription: watch("metaDescription"),
                metaKeywords: watch("metaKeywords"),
                ogImageUrl: watch("ogImageUrl"),
                title: watch("title"),
                slug: watch("slug"),
              }}
              onAdditionalFieldsChange={(fields) => {
                if (fields.published !== undefined) setValue("published", fields.published);
                if (fields.showTitle !== undefined) setValue("showTitle", fields.showTitle);
                if (fields.containerWidth !== undefined) setValue("containerWidth", fields.containerWidth as "narrow" | "full" | "medium" | "wide" | undefined);
                if (fields.customCss !== undefined) setValue("customCss", fields.customCss);
                if (fields.metaDescription !== undefined) setValue("metaDescription", fields.metaDescription);
                if (fields.metaKeywords !== undefined) setValue("metaKeywords", fields.metaKeywords);
                if (fields.ogImageUrl !== undefined) setValue("ogImageUrl", fields.ogImageUrl);
                if (fields.title !== undefined) setValue("title", fields.title);
                if (fields.slug !== undefined) setValue("slug", fields.slug);
              }}
              onSave={async (content: PageContentV1) => {
                setBuilderContent(content);
                const payload = {
                  ...watch(),
                  draftContentJson: content,
                };
                const response = await fetch(`/api/pages/${initialData.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
                  throw new Error(errorData.message || errorData.error || "Fehler beim Speichern");
                }
              }}
            />
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <Builder value={builderContent as PageContentV1} onChange={(c) => setBuilderContent(c as BuilderContent)} />
            </div>
          )
        ) : initialData?.id ? (
          <PageBuilderV2Shell
            pageId={initialData.id}
            initialContentJson={isPageContentV2(builderContent) ? builderContent : { version: 2, html: "" }}
            pageSlug={initialData.slug}
            pagePublished={initialData.published}
            currentHtmlRef={v2CurrentHtmlRef}
            additionalFields={{
              published: watch("published"),
              showTitle: watch("showTitle"),
              containerWidth: watch("containerWidth"),
              customCss: watch("customCss"),
              metaDescription: watch("metaDescription"),
              metaKeywords: watch("metaKeywords"),
              ogImageUrl: watch("ogImageUrl"),
              title: watch("title"),
              slug: watch("slug"),
            }}
            onAdditionalFieldsChange={(fields) => {
              if (fields.published !== undefined) setValue("published", fields.published);
              if (fields.showTitle !== undefined) setValue("showTitle", fields.showTitle);
              if (fields.containerWidth !== undefined) setValue("containerWidth", fields.containerWidth as "narrow" | "full" | "medium" | "wide" | undefined);
              if (fields.customCss !== undefined) setValue("customCss", fields.customCss);
              if (fields.metaDescription !== undefined) setValue("metaDescription", fields.metaDescription);
              if (fields.metaKeywords !== undefined) setValue("metaKeywords", fields.metaKeywords);
              if (fields.ogImageUrl !== undefined) setValue("ogImageUrl", fields.ogImageUrl);
              if (fields.title !== undefined) setValue("title", fields.title);
              if (fields.slug !== undefined) setValue("slug", fields.slug);
            }}
            onSave={async (content: PageContentV2) => {
              setBuilderContent(content);
              const payload = {
                ...watch(),
                draftContentJson: content,
              };
              const response = await fetch(`/api/pages/${initialData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
                throw new Error(errorData.message || errorData.error || "Fehler beim Speichern");
              }
            }}
          />
        ) : (
          <PageBuilderV2Shell
            pageId={undefined}
            initialContentJson={isPageContentV2(builderContent) ? builderContent : { version: 2, html: "" }}
            pageSlug={slug}
            pagePublished={watch("published")}
            onChange={(content) => setBuilderContent(content)}
            onSave={async () => {}}
            currentHtmlRef={v2CurrentHtmlRef}
            additionalFields={{
              published: watch("published"),
              showTitle: watch("showTitle"),
              containerWidth: watch("containerWidth"),
              customCss: watch("customCss"),
              metaDescription: watch("metaDescription"),
              metaKeywords: watch("metaKeywords"),
              ogImageUrl: watch("ogImageUrl"),
              title: watch("title"),
              slug: watch("slug"),
            }}
            onAdditionalFieldsChange={(fields) => {
              if (fields.published !== undefined) setValue("published", fields.published);
              if (fields.showTitle !== undefined) setValue("showTitle", fields.showTitle);
              if (fields.containerWidth !== undefined) setValue("containerWidth", fields.containerWidth as "narrow" | "full" | "medium" | "wide" | undefined);
              if (fields.customCss !== undefined) setValue("customCss", fields.customCss);
              if (fields.metaDescription !== undefined) setValue("metaDescription", fields.metaDescription);
              if (fields.metaKeywords !== undefined) setValue("metaKeywords", fields.metaKeywords);
              if (fields.ogImageUrl !== undefined) setValue("ogImageUrl", fields.ogImageUrl);
              if (fields.title !== undefined) setValue("title", fields.title);
              if (fields.slug !== undefined) setValue("slug", fields.slug);
            }}
          />
        )}
      </div>

      {/* Buttons nur anzeigen wenn kein PageBuilderShell verwendet wird (z.B. beim Erstellen) */}
      {!initialData?.id && (
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
      )}
    </form>
  );
}

