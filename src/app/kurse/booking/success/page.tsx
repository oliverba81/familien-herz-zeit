import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    redirect("/kurse");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Zahlung erfolgreich!
          </h1>
          <p className="text-gray-600 mb-4">
            Vielen Dank für deine Buchung. Wir haben deine Zahlung erhalten und deine Buchungsanfrage wurde erstellt.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Du erhältst in Kürze eine Bestätigungs-E-Mail mit allen Details zu deiner Buchung.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/kurse"
            className="block w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Zurück zu den Kursen
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

