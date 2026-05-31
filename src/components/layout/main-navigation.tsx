"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function MainNavigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Navigation nicht auf Admin-Seiten anzeigen
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Startseite" },
    {
      label: "Herz-Zeit-Angebote",
      submenu: [
        {
          label: "Für Eltern",
          submenu: [
            {
              label: "Eltern-Kind-Kurse",
              submenu: [
                { href: "/babyzeichensprachekurs", label: "Babyzeichensprachekurs" },
                { href: "/themenstunden", label: "Themenstunden" },
              ],
            },
            { href: "/elternkurse", label: "Elternkurse" },
            { href: "/workshops-eltern", label: "Workshops" },
            { href: "/elternberatung", label: "Elternberatung" },
          ],
        },
        {
          label: "Für Fachpersonal",
          submenu: [
            { href: "/weiterbildungen", label: "Weiterbildungen" },
            { href: "/workshops-fachpersonal", label: "Workshops" },
            { href: "/themenstunden-fachpersonal", label: "Themenstunden" },
            { href: "/elternabende", label: "Elternabende" },
          ],
        },
        { href: "/vortraege-und-seminare", label: "Vorträge und Seminare" },
      ],
    },
    {
      label: "Kursanmeldung",
      submenu: [
        { href: "/kursanmeldung-babyzeichensprache", label: "Anmeldung Babyzeichensprachekurs" },
        { href: "/kursanmeldung-themenstunden", label: "Anmeldung Themenstunden" },
      ],
    },
    {
      label: "Babyzeichensprache",
      submenu: [
        { href: "/babyzeichensprache/was-ist-das", label: "Was ist das?" },
        { href: "/babyzeichensprache/wie-funktioniert-das", label: "Wie funktioniert das?" },
        { href: "/babyzeichensprache/ab-welchem-alter", label: "Ab welchem Alter?" },
        { href: "/babyzeichensprache/fuer-wen-geeignet", label: "Für wen geeignet?" },
        { href: "/babyzeichensprache/auch-fuer-groessere-kinder", label: "Auch für größere Kinder?" },
        { href: "/babyzeichensprache/hintergruende", label: "Hintergründe" },
        { href: "/babyzeichensprache/wissenschaft", label: "Wissenschaft" },
        { href: "/babyzeichensprache/babyzeichen-kindermund", label: "Babyzeichen-Kindermund" },
        { href: "/babyzeichensprache/haeufige-fragen", label: "Häufige Fragen" },
      ],
    },
    {
      label: "Über Mich",
      submenu: [
        { href: "/ueber-mich/persoenlich", label: "Persönlich" },
        { href: "/ueber-mich/beruflich", label: "Beruflich" },
        { href: "/ueber-mich/ehrenamtlich", label: "Ehrenamtlich" },
      ],
    },
    { href: "/kontakt", label: "Kontakt" },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-rose-500">
              Familien Herz Zeit
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.href) {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-rose-100 text-rose-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-rose-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      openDropdown === item.label
                        ? "bg-rose-100 text-rose-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-rose-600"
                    }`}
                  >
                    {item.label} ▼
                  </button>
                  {openDropdown === item.label && item.submenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-2">
                      {item.submenu.map((subItem, subIdx) => {
                        if (subItem.href) {
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {subItem.label}
                            </Link>
                          );
                        }
                        return (
                          <div key={subItem.label} className="border-t border-gray-100 mt-1 pt-1">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                              {subItem.label}
                            </div>
                            {subItem.submenu?.map((subSubItem, idx) => (
                              <Link
                                key={subSubItem.href || `subsub-${idx}`}
                                href={subSubItem.href || "#"}
                                className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {subSubItem.label}
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setOpenDropdown(openDropdown === "mobile" ? null : "mobile")}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {openDropdown === "mobile" && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {navItems.map((item) => {
              if (item.href) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpenDropdown(null)}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <div key={item.label}>
                  <button
                    className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  >
                    {item.label} {openDropdown === item.label ? "▲" : "▼"}
                  </button>
                  {openDropdown === item.label && item.submenu && (
                    <div className="pl-4">
                      {item.submenu.map((subItem, subIdx) => {
                        if (subItem.href) {
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                              onClick={() => setOpenDropdown(null)}
                            >
                              {subItem.label}
                            </Link>
                          );
                        }
                        return (
                          <div key={subItem.label}>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                              {subItem.label}
                            </div>
                            {subItem.submenu?.map((subSubItem, subSubIdx) => (
                              <Link
                                key={subSubItem.href || `subsub-mobile-${subSubIdx}`}
                                href={subSubItem.href || "#"}
                                className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100"
                                onClick={() => setOpenDropdown(null)}
                              >
                                {subSubItem.label}
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

