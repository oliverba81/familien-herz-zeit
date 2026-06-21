import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import RenderPageContent from "@/components/page-renderer/render-page-content";
import type { Metadata } from "next";
import { absoluteUrl, buildOpenGraph, extractTextFromContent } from "@/lib/seo/meta";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PreviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) {
    return {
      title: "Vorschau nicht verfügbar | Familien Herz Zeit",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const page = await db.page.findFirst({
    where: {
      slug,
      previewToken: token,
    },
  });

  if (!page) {
    return {
      title: "Vorschau nicht verfügbar | Familien Herz Zeit",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Optional: Prüfe Token Expiry
  if (page.previewTokenExpires && new Date() > page.previewTokenExpires) {
    return {
      title: "Vorschau abgelaufen | Familien Herz Zeit",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `Vorschau: ${page.title} | Familien Herz Zeit`;
  const draftContent = page.draftContentJson ?? page.contentJson;
  const description =
    extractTextFromContent(draftContent) ||
    "Vorschau - Familien Herz Zeit";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    ...buildOpenGraph({
      title: `Vorschau: ${page.title}`,
      description,
      url: absoluteUrl(`/preview/${slug}?token=${token}`),
    }),
  };
}

export default async function PreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  let page;
  if (token) {
    // Token-Pfad: per Preview-Token teilbar (auch ohne Login).
    page = await db.page.findFirst({
      where: { slug, previewToken: token },
    });
    if (!page) {
      notFound();
    }
    if (page.previewTokenExpires && new Date() > page.previewTokenExpires) {
      notFound();
    }
  } else {
    // Kein Token (z. B. „Vorschau"-Button aus dem Builder): nur für eingeloggte
    // ADMIN/EDITOR. requireRole leitet sonst auf /admin/login um.
    await requireRole(["ADMIN", "EDITOR"]);
    page = await db.page.findFirst({ where: { slug } });
    if (!page) {
      notFound();
    }
  }

  const draftContent = page.draftContentJson ?? page.contentJson;
  if (!draftContent) {
    notFound();
  }

  const containerWidthClass = {
    full: "",
    wide: "max-w-7xl",
    medium: "max-w-4xl",
    narrow: "max-w-2xl",
  }[page.containerWidth || "medium"];

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const builderUrl = `${baseUrl}/admin/page-builder?pageId=${page.id}`;

  return (
    <>
      {page.customCss && (
        <style dangerouslySetInnerHTML={{ __html: page.customCss }} />
      )}
      <div className="bg-gray-50 py-12">
        <div className="bg-yellow-100 border-b border-yellow-300 py-2">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <span className="font-semibold">⚠️ Vorschau (nicht veröffentlicht)</span>
                <span className="text-yellow-600">•</span>
                <span>Diese Seite ist nicht öffentlich sichtbar</span>
              </div>
              <a
                href={builderUrl}
                className="text-sm text-yellow-800 hover:text-yellow-900 underline font-medium"
              >
                Zum Builder →
              </a>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={containerWidthClass ? `${containerWidthClass} mx-auto` : "mx-auto"}>
            <article className="bg-white rounded-lg shadow-sm p-8 md:p-12">
              {page.showTitle !== false && (
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                  {page.title}
                </h1>
              )}
              <RenderPageContent content={draftContent} />
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

