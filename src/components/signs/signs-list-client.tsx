"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Tag {
  id: string;
  slug: string;
  name: string;
}

interface Sign {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  tags: Tag[];
}

interface SignsListClientProps {
  initialSigns: Sign[];
  allTags: Tag[];
  initialQuery: string;
  initialTag: string;
}

export default function SignsListClient({
  initialSigns,
  allTags,
  initialQuery,
  initialTag,
}: SignsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedTag, setSelectedTag] = useState(initialTag);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`/zeichen?${params.toString()}`);
  };

  const handleTagFilter = (tagSlug: string) => {
    const newTag = selectedTag === tagSlug ? "" : tagSlug;
    setSelectedTag(newTag);
    const params = new URLSearchParams(searchParams.toString());
    if (newTag) {
      params.set("tag", newTag);
    } else {
      params.delete("tag");
    }
    router.push(`/zeichen?${params.toString()}`);
  };

  return (
    <>
      {/* Filter */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Suche nach Zeichen..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTagFilter("")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTag === ""
                    ? "bg-rose-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Alle
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagFilter(tag.slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTag === tag.slug
                      ? "bg-rose-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signs Grid */}
      {initialSigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchQuery || selectedTag
              ? "Keine Zeichen gefunden."
              : "Derzeit sind keine Zeichen verfügbar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialSigns.map((sign) => (
            <Link
              key={sign.id}
              href={`/zeichen/${sign.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {sign.imageUrl ? (
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img
                    src={sign.imageUrl}
                    alt={sign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Kein Bild</span>
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {sign.title}
                </h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {sign.description.length > 150
                    ? `${sign.description.substring(0, 150)}...`
                    : sign.description}
                </p>
                {sign.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sign.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}



