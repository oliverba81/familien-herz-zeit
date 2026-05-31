import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Verfügbare Funktionen
        </h2>
        <div className="space-y-3">
          <Link
            href="/admin/pages"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Seiten verwalten</h3>
            <p className="text-sm text-gray-600">
              Erstellen, bearbeiten und löschen Sie Seiten
            </p>
          </Link>
          <Link
            href="/admin/media"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Medien verwalten</h3>
            <p className="text-sm text-gray-600">
              Verwalten Sie Ihre hochgeladenen Bilder und Videos
            </p>
          </Link>
          <Link
            href="/admin/video-courses"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Videokurse verwalten</h3>
            <p className="text-sm text-gray-600">
              Erstellen, bearbeiten und löschen Sie Videokurse
            </p>
          </Link>
          <Link
            href="/admin/courses"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Live-Kurse verwalten</h3>
            <p className="text-sm text-gray-600">
              Erstellen, bearbeiten und löschen Sie Live-Kurse
            </p>
          </Link>
          <Link
            href="/admin/bookings"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Buchungen verwalten</h3>
            <p className="text-sm text-gray-600">
              Verwalten Sie alle Buchungen und ändern Sie den Status
            </p>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/"
          className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
        >
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}

