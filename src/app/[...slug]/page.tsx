import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import RenderPageContent from "@/components/page-renderer/render-page-content";
import type { Metadata } from "next";
import { cachedPageBySlug, cachedHomepageSlug } from "@/lib/cache/prisma-cache";
import { absoluteUrl, buildOpenGraph, extractTextFromContent, truncateAtWordBoundary } from "@/lib/seo/meta";

// Route-Konfiguration für bessere Performance
// force-dynamic verhindert statische Generierung und beschleunigt Development
export const dynamic = "force-dynamic";
export const dynamicParams = true; // Erlaube dynamische Parameter

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: slugArray } = await params;
  const slug = slugArray.join("/");
  const page = await cachedPageBySlug(slug);

  if (!page) {
    return {
      title: "Seite nicht gefunden | Familien Herz Zeit",
    };
  }

  const title = `${page.title} | Familien Herz Zeit`;
  const contentForMeta = page.publishedContentJson ?? page.contentJson;
  const rawDescription =
    (page.metaDescription && page.metaDescription.trim()) ||
    extractTextFromContent(contentForMeta) ||
    "Familien Herz Zeit - Kurse und Angebote für die ganze Familie";
  const description = truncateAtWordBoundary(rawDescription, 158);

  const url = absoluteUrl(`/${slug}`);

  const keywords =
    page.metaKeywords && page.metaKeywords.trim()
      ? page.metaKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;

  return {
    title,
    description,
    keywords: keywords?.length ? keywords : undefined,
    alternates: {
      canonical: url,
    },
    ...buildOpenGraph({
      title: page.title,
      description,
      url,
      imageUrl: page.ogImageUrl && page.ogImageUrl.trim() ? page.ogImageUrl : undefined,
    }),
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug: slugArray } = await params;
  const slug = slugArray.join("/");

  // Die als Startseite konfigurierte Seite ist bereits unter "/" erreichbar.
  // Den Slug-Aufruf (z. B. /startseite) dauerhaft (308) auf "/" umleiten, damit
  // derselbe Inhalt nicht unter zwei URLs ausgeliefert wird (Duplicate Content).
  const homepageSlug = await cachedHomepageSlug();
  if (slug === homepageSlug) {
    permanentRedirect("/");
  }

  const page = await cachedPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // Nur veröffentlichte Seiten zeigen
  if (page.published !== true) {
    notFound();
  }

  // Content: V2 (WYSIWYG HTML) oder V1 (Block-Content)
  const contentToRender = page.publishedContentJson ?? page.contentJson;
  if (!contentToRender) {
    notFound();
  }

  const containerWidthClass = {
    full: "",
    wide: "max-w-7xl",
    medium: "max-w-4xl",
    narrow: "max-w-2xl",
  }[page.containerWidth || "medium"];

  return (
    <>
      {page.customCss && (
        <style dangerouslySetInnerHTML={{ __html: page.customCss }} />
      )}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={containerWidthClass ? `${containerWidthClass} mx-auto` : "mx-auto"}>
            <article className="bg-white rounded-lg shadow-sm p-8 md:p-12">
              {page.showTitle !== false && (
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                  {page.title}
                </h1>
              )}
              <RenderPageContent content={contentToRender} />
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

