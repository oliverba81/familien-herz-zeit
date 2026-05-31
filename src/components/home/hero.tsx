import Link from "next/link";

export default function Hero() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Familien Herz Zeit
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-12">
          Willkommen auf unserer Familienwebsite. Hier teilen wir unsere
          schönsten Momente und Erinnerungen.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/videokurse"
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-colors duration-200"
          >
            Videokurse entdecken
          </Link>
          <Link
            href="/admin/login"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-8 py-3 rounded-lg shadow-lg transition-colors duration-200"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

