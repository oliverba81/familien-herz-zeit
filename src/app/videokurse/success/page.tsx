import { Metadata } from "next";
import Link from "next/link";
import SuccessPageClient from "@/components/video-courses/success-page-client";

export const metadata: Metadata = {
  title: "Zahlung erfolgreich",
  description: "Vielen Dank für deinen Kauf",
};

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <SuccessPageClient />
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vielen Dank für deinen Kauf!
            </h1>
            <p className="text-gray-600 mb-6">
              Wenn die Zahlung erfolgreich war, erhältst du in Kürze eine E-Mail mit deinem persönlichen Zugangslink zum Videokurs.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Was passiert jetzt?
            </h2>
            <ul className="text-left text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Deine Zahlung wird verarbeitet</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Du erhältst eine E-Mail mit deinem Zugangslink</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Der Link ist 90 Tage gültig</span>
              </li>
            </ul>
          </div>

          {sessionId && (
            <p className="text-sm text-gray-500 mb-6">
              Session-ID: {sessionId}
            </p>
          )}

          <div className="space-y-4">
            <Link
              href="/videokurse"
              className="inline-block w-full sm:w-auto px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors"
            >
              Zurück zu den Videokursen
            </Link>
            <div>
              <Link
                href="/"
                className="text-rose-500 hover:text-rose-600 font-medium"
              >
                Zur Startseite
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Falls du keine E-Mail erhalten hast, überprüfe bitte deinen Spam-Ordner oder{" "}
              <Link href="/kontakt" className="text-rose-500 hover:text-rose-600">
                kontaktiere uns
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

