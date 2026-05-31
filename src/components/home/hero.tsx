import Link from "next/link";

export default function Hero() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Familien Herz Zeit
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Willkommen auf unserer Familienwebsite. Hier teilen wir unsere
            schönsten Momente und Erinnerungen.
          </p>
          <Link
            href="/admin/login"
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-colors duration-200"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}


