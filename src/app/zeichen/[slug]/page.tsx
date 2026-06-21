import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Metadata } from "next";
import { getBaseUrl, absoluteUrl } from "@/lib/seo/meta";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sign = await db.sign.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!sign) {
    return {
      title: "Zeichen nicht gefunden",
    };
  }

  const description = sign.description.length > 160
    ? `${sign.description.substring(0, 160)}...`
    : sign.description;

  return {
    title: `${sign.title} – Babyzeichen | Familien Herz Zeit`,
    description,
    alternates: {
      canonical: absoluteUrl(`/zeichen/${slug}`),
    },
    openGraph: {
      title: `${sign.title} – Babyzeichen`,
      description,
      url: absoluteUrl(`/zeichen/${slug}`),
      type: "article",
      images: sign.imageUrl ? [{ url: sign.imageUrl }] : undefined,
    },
  };
}

export default async function SignDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const sign = await db.sign.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!sign) {
    notFound();
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{sign.title}</h1>
            {sign.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sign.tags.map((st) => (
                  <span
                    key={st.tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {st.tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Image/Video */}
            {sign.imageUrl && (
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src={sign.imageUrl}
                  alt={sign.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {sign.videoUrl && (
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <video
                  src={sign.videoUrl}
                  controls
                  className="w-full h-full"
                >
                  Dein Browser unterstützt das Video-Element nicht.
                </video>
              </div>
            )}

            {/* Description */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Beschreibung</h2>
              <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                {sign.description}
              </div>
            </div>

            {/* How To */}
            {sign.howTo && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  So machst du das Zeichen
                </h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {sign.howTo}
                </div>
              </div>
            )}

            {/* Tips */}
            {sign.tips && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Tipps</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                  {sign.tips}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/zeichen"
            className="text-rose-500 hover:text-rose-600 font-medium"
          >
            ← Zurück zum Lexikon
          </Link>
        </div>
      </div>
    </div>
  );
}



