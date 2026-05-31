import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Zahlung abgebrochen",
  description: "PayPal Zahlung wurde abgebrochen",
};

interface CancelPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function PaypalCancelPage({ searchParams }: CancelPageProps) {
  const params = await searchParams;
  const courseId = params.courseId;

  let courseSlug = null;
  if (courseId) {
    const course = await db.videoCourse.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
    courseSlug = course?.slug || null;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Zahlung abgebrochen
            </h1>
            <p className="text-gray-600 mb-6">
              Die PayPal-Zahlung wurde abgebrochen. Keine Sorge, es wurden keine Kosten verursacht.
            </p>
          </div>

          <div className="space-y-4">
            {courseSlug ? (
              <Link
                href={`/videokurse/${courseSlug}`}
                className="inline-block w-full sm:w-auto px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors"
              >
                Zurück zum Videokurs
              </Link>
            ) : (
              <Link
                href="/videokurse"
                className="inline-block w-full sm:w-auto px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors"
              >
                Zurück zu den Videokursen
              </Link>
            )}
            <div>
              <Link
                href="/"
                className="text-rose-500 hover:text-rose-600 font-medium"
              >
                Zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

