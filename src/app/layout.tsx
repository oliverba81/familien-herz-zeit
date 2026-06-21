import "./globals.css";
import { Providers } from "./providers";
import NavigationLoader from "@/components/navigation/navigation-loader";
import FooterLoader from "@/components/navigation/footer-loader";
import { generateMetadata } from "@/components/layout/metadata-loader";
import AnalyticsGate from "@/components/analytics/analytics-gate";
import CookieBanner from "@/components/consent/cookie-banner";

export { generateMetadata };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="flex flex-col min-h-screen">
        {/* Muss als URL-Stylesheet geladen werden (kein JS-Import möglich): der
            TinyMCE-Editor referenziert dieselbe Datei via content_css. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/page-builder-v2-presets.css" />
        <Providers>
          <AnalyticsGate />
          <NavigationLoader />
          <main className="flex-1">{children}</main>
          <FooterLoader />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}

