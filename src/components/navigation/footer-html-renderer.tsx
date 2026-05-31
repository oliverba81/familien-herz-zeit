"use client";

import { usePathname } from "next/navigation";

interface FooterHtmlRendererProps {
  html: string;
}

export default function FooterHtmlRenderer({ html }: FooterHtmlRendererProps) {
  const pathname = usePathname();

  // Footer nicht auf Admin-Seiten anzeigen
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Validiere HTML
  if (!html || html.trim() === "") {
    return null;
  }

  // Rendere HTML mit dangerouslySetInnerHTML
  // WICHTIG: HTML sollte nur von vertrauenswürdigen Quellen kommen (Admin-Bereich)
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

