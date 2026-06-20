import { db } from "@/lib/db";
import Link from "next/link";
import { Metadata } from "next";
import SignsListClient from "@/components/signs/signs-list-client";

export const metadata: Metadata = {
  title: "Babyzeichen-Lexikon | Familien Herz Zeit",
  description: "Entdecke unsere Sammlung von Babyzeichen",
};

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function SignsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const tagSlug = params.tag || "";

  // Lade alle Tags für Filter
  const allTags = await db.tag.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // Build where clause
  const where: any = {
    status: "PUBLISHED",
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (tagSlug) {
    where.tags = {
      some: {
        tag: {
          slug: tagSlug,
        },
      },
    };
  }

  const signs = await db.sign.findMany({
    where,
    include: {
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  // Transformiere für Frontend
  const transformedSigns = signs.map((sign) => ({
    ...sign,
    tags: sign.tags.map((st) => st.tag),
  }));

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Babyzeichen-Lexikon</h1>
          <p className="text-lg text-gray-600">
            Entdecke unsere Sammlung von Babyzeichen
          </p>
        </div>

        <SignsListClient
          initialSigns={transformedSigns}
          allTags={allTags}
          initialQuery={q}
          initialTag={tagSlug}
        />
      </div>
    </div>
  );
}
