import PageRendererServer from "@/components/page-renderer/page-renderer-server";
import PageRendererHtml from "@/components/page-renderer/page-renderer-html";
import { normalizeContent } from "@/lib/page-builder/templates";
import { isPageContentV2 } from "@/lib/page-builder/schema";
import Hero from "@/components/home/hero";
import { cachedHomepagePage } from "@/lib/cache/prisma-cache";

export default async function Home() {
  // Startseite: konfiguriert in Admin (SiteSettings homepage_slug) oder Fallback "home"
  const homepage = await cachedHomepagePage();

  // Wenn Homepage existiert, zeige sie an
  if (homepage) {
    const content = homepage.publishedContentJson ?? homepage.contentJson;
    const isV2 = isPageContentV2(content);
    const normalizedContent = isV2 ? null : normalizeContent(content);

    const containerWidthClass = {
      full: "",
      wide: "max-w-7xl",
      medium: "max-w-4xl",
      narrow: "max-w-2xl",
    }[homepage.containerWidth || "medium"];

    return (
      <>
        {homepage.customCss && (
          <style dangerouslySetInnerHTML={{ __html: homepage.customCss }} />
        )}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className={containerWidthClass ? `${containerWidthClass} mx-auto` : "mx-auto"}>
              <article className="bg-white rounded-lg shadow-sm p-8 md:p-12">
                {homepage.showTitle !== false && (
                  <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    {homepage.title}
                  </h1>
                )}
                {isV2 ? (
                  <PageRendererHtml html={(content as { html: string }).html} />
                ) : (
                  <PageRendererServer content={normalizedContent!} />
                )}
              </article>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Fallback: Statische Hero-Komponente
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <Hero />
    </div>
  );
}

