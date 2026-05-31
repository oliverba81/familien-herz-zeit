"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Footer nicht auf Admin-Seiten anzeigen
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Familien Herz Zeit</h3>
            <p className="text-gray-400 text-sm mb-4">
              Wertvolle Herzzeit für dich, für deine Kinder, für deine Mitmenschen, für gutes Miteinander!
            </p>
            <p className="text-gray-400 text-sm">
              Aktuell in Hainichen, Mittweida & Rossau
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontakt</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="tel:01748372463"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  0174 / 837 24 63
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@familien-herz-zeit.de"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  info@familien-herz-zeit.de
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white">
                  Startseite
                </Link>
              </li>
              <li>
                <Link href="/herz-zeit-angebote" className="text-gray-400 hover:text-white">
                  Herz-Zeit-Angebote
                </Link>
              </li>
              <li>
                <Link href="/kursanmeldung" className="text-gray-400 hover:text-white">
                  Kursanmeldung
                </Link>
              </li>
              <li>
                <Link href="/babyzeichensprache" className="text-gray-400 hover:text-white">
                  Babyzeichensprache
                </Link>
              </li>
              <li>
                <Link href="/ueber-mich" className="text-gray-400 hover:text-white">
                  Über Mich
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-gray-400 hover:text-white">
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/impressum" className="text-gray-400 hover:text-white">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutzerklaerung" className="text-gray-400 hover:text-white">
                  Datenschutzerklärung
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Familien Herz Zeit. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
}

