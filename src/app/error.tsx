"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-rose-400 mb-4">⚠️</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mt-4">
          Ups, da ist etwas schiefgelaufen
        </h2>
        <p className="text-gray-600 mt-4">
          Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.
        </p>
        <div className="mt-8 space-y-4">
          <button
            onClick={reset}
            className="inline-block px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            Seite neu laden
          </button>
          <div>
            <Link
              href="/"
              className="text-rose-600 hover:text-rose-700 underline"
            >
              Zur Startseite
            </Link>
          </div>
        </div>
        {process.env.NODE_ENV === "development" && error.digest && (
          <p className="mt-4 text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}





