import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-rose-400">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mt-4">
          Seite nicht gefunden
        </h2>
        <p className="text-gray-600 mt-4">
          Die von dir gesuchte Seite existiert leider nicht oder wurde verschoben.
        </p>
        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            Zur Startseite
          </Link>
          <div className="flex gap-4 justify-center">
            <Link
              href="/kurse"
              className="text-rose-600 hover:text-rose-700 underline"
            >
              Kurse
            </Link>
            <Link
              href="/videokurse"
              className="text-rose-600 hover:text-rose-700 underline"
            >
              Videokurse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}





