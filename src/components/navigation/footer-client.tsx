"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  id: string;
  label: string;
  href: string | null;
  children?: NavigationItem[];
}

interface FooterClientProps {
  items: NavigationItem[];
}

export default function FooterClient({ items }: FooterClientProps) {
  const pathname = usePathname();

  // Footer nicht auf Admin-Seiten anzeigen
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const footerItems = items || [];

  // Gruppiere Footer Items in Spalten (max 4 Spalten)
  const columns: NavigationItem[][] = [];
  const itemsPerColumn = Math.ceil(footerItems.length / 4);
  
  for (let i = 0; i < footerItems.length; i += itemsPerColumn) {
    columns.push(footerItems.slice(i, i + itemsPerColumn));
  }

  const renderFooterItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    const paddingLeft = level * 16;
    
    return (
      <li key={item.id || `footer-${item.label}-${item.href ?? ""}`}>
        {item.href ? (
          <Link
            href={item.href}
            className="text-gray-400 hover:text-white transition-colors block"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {item.label}
          </Link>
        ) : (
          <span className="text-gray-400 block" style={{ paddingLeft: `${paddingLeft}px` }}>
            {item.label}
          </span>
        )}
        {item.children && item.children.length > 0 && (
          <ul className="mt-2 space-y-1">
            {item.children.map((child) => renderFooterItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

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
          {columns.map((column, colIndex) => (
            <div key={colIndex}>
              <h3 className="text-lg font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                {column.map((item) => renderFooterItem(item, 0))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Familien Herz Zeit. Alle Rechte vorbehalten.</p>
          <p className="mt-2">
            <a
              href="#cookie-einstellungen"
              className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Cookie-Einstellungen
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

