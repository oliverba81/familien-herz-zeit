"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { getConsentFromCookie } from "@/lib/consent/storage";

type AnalyticsProvider = "none" | "matomo" | "ga4";

function getProvider(): AnalyticsProvider {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "none";
  return provider as AnalyticsProvider;
}

export default function AnalyticsGate() {
  const pathname = usePathname();
  const provider = getProvider();

  // Admin-Bereich nicht tracken
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Prüfe Consent aus Cookie (client-side)
  if (typeof window !== "undefined") {
    const consent = getConsentFromCookie();
    if (!consent || !consent.statistics) {
      return null;
    }
  } else {
    // SSR: kein Tracking
    return null;
  }

  // Provider-spezifische Scripts
  switch (provider) {
    case "matomo":
      return <MatomoScript />;
    case "ga4":
      return <GA4Script />;
    case "none":
    default:
      return null;
  }
}

function MatomoScript() {
  const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL;
  const matomoSiteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;

  // Hook muss vor jedem early-return stehen (rules-of-hooks). Die Konfig-Prüfung
  // wandert in den Effect-Body — verhaltensgleich (env-Werte sind konstant).
  useEffect(() => {
    if (!matomoUrl || !matomoSiteId) return;
    // Initialisiere _paq Array
    if (typeof window !== "undefined") {
      window._paq = window._paq || [];

      // Matomo Konfiguration
      window._paq.push(["trackPageView"]);
      window._paq.push(["enableLinkTracking"]);
    }
  }, [matomoUrl, matomoSiteId]);

  if (!matomoUrl || !matomoSiteId) {
    console.warn("Matomo URL oder Site ID nicht konfiguriert");
    return null;
  }

  return (
    <>
      <Script
        id="matomo"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var _paq = window._paq || [];
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);
            (function() {
              var u="${matomoUrl}";
              _paq.push(['setTrackerUrl', u+'matomo.php']);
              _paq.push(['setSiteId', '${matomoSiteId}']);
              var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
              g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
            })();
          `,
        }}
      />
    </>
  );
}

function GA4Script() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

  if (!ga4Id) {
    console.warn("GA4 ID nicht konfiguriert");
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}', {
              anonymize_ip: true,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
        }}
      />
    </>
  );
}

