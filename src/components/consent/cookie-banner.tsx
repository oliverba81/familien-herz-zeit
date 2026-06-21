"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "./consent-provider";
import { Consent } from "@/lib/consent/types";
import { getConsentFromCookie } from "@/lib/consent/storage";
import { CookieCatalogItem, parseCookieCatalog } from "@/lib/consent/catalog";

export default function CookieBanner() {
  const pathname = usePathname();
  const { consent, setConsent } = useConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [catalog, setCatalog] = useState<CookieCatalogItem[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    // Mount-Flag + Banner-Sichtbarkeit aus Cookie (Client-only API) muss nach dem Mount
    // erfolgen, um SSR-Hydration-Mismatch zu vermeiden; nicht aus Props/State ableitbar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Banner nur zeigen, wenn kein Consent-Cookie vorhanden ist
    const cookieConsent = getConsentFromCookie();
    setShowBanner(!cookieConsent);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const items = parseCookieCatalog(data?.cookie_catalog);
        if (!cancelled) {
          setCatalog(items);
        }
      } catch {
        // Ignorieren: Banner funktioniert auch ohne Katalog
      } finally {
        if (!cancelled) {
          setCatalogLoaded(true);
        }
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  // Admin-Bereich: kein Banner
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Während SSR: nichts rendern
  if (!mounted) {
    return null;
  }

  const handleAcceptAll = () => {
    const newConsent: Consent = {
      necessary: true,
      statistics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    };
    setConsent(newConsent);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const newConsent: Consent = {
      necessary: true,
      statistics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    };
    setConsent(newConsent);
    setShowBanner(false);
  };

  const handleSaveSettings = () => {
    // Settings werden bereits über setConsent gespeichert
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) {
    return null;
  }

  const necessaryCookies = catalog.filter((item) => item.category === "necessary");
  const statisticsCookies = catalog.filter((item) => item.category === "statistics");
  const marketingCookies = catalog.filter((item) => item.category === "marketing");

  const renderCookieList = (items: CookieCatalogItem[]) => {
    if (!catalogLoaded) {
      return <p className="text-xs text-gray-500 mt-1">Lade Cookie-Liste...</p>;
    }
    if (items.length === 0) {
      return <p className="text-xs text-gray-500 mt-1">Keine Cookies erfasst.</p>;
    }
    return (
      <ul className="mt-2 space-y-1 text-xs text-gray-600">
        {items.map((item) => (
          <li key={item.name}>
            <span className="font-medium text-gray-700">{item.name}</span>
            {item.purpose ? ` – ${item.purpose}` : ""}
            {item.provider ? ` (${item.provider})` : ""}
            {item.duration ? `, Laufzeit: ${item.duration}` : ""}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {!showSettings ? (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cookie-Einstellungen
                </h3>
                <p className="text-sm text-gray-600">
                  Wir verwenden Cookies, um dir die bestmögliche Erfahrung zu bieten.
                  Einige Cookies sind notwendig für die Funktionalität der Website, 
                  andere helfen uns, die Nutzung zu analysieren und zu verbessern.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Nur notwendige
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Einstellungen
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
                >
                  Alle akzeptieren
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Cookie-Einstellungen
            </h3>
            <p className="text-sm text-gray-600">
              Wähle, welche Cookies du zulassen möchtest:
            </p>

            <div className="space-y-3">
              {/* Necessary Cookies (immer aktiv) */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    Notwendige Cookies
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Diese Cookies sind für die Grundfunktionen der Website erforderlich.
                  </p>
                  {renderCookieList(necessaryCookies)}
                </div>
                <div className="ml-4">
                  <span className="text-sm text-gray-500">Immer aktiv</span>
                </div>
              </div>

              {/* Statistics Cookies */}
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    Statistik-Cookies
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Helfen uns zu verstehen, wie Besucher mit der Website interagieren.
                  </p>
                  {renderCookieList(statisticsCookies)}
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.statistics}
                      onChange={(e) => {
                        setConsent({
                          ...consent,
                          statistics: e.target.checked,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    Marketing-Cookies
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Werden verwendet, um dir relevante Werbung anzuzeigen.
                  </p>
                  {renderCookieList(marketingCookies)}
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => {
                        setConsent({
                          ...consent,
                          marketing: e.target.checked,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              >
                Einstellungen speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

