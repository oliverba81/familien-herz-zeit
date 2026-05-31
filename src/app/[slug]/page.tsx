import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PageRenderer from "@/components/page-renderer/page-renderer";
import { normalizeContent } from "@/lib/page-builder/templates";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.page.findFirst({
    where: {
      slug,
      published: true,
    },
  });

  if (!page) {
    return {
      title: "Seite nicht gefunden",
    };
  }

  return {
    title: page.title,
    description: `Seite: ${page.title}`,
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;

  const page = await db.page.findFirst({
    where: {
      slug,
      published: true,
    },
  });

  if (!page) {
    notFound();
  }

  // Normalisiere Content (unterstützt altes und neues Format)
  const normalizedContent = normalizeContent(page.contentJson);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              {page.title}
            </h1>
            <PageRenderer content={normalizedContent} />
          </article>
        </div>
      </div>
    </div>
  );
}

