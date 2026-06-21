"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface HeaderHtmlRendererProps {
  html: string;
}

export default function HeaderHtmlRenderer({ html }: HeaderHtmlRendererProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mount-Flag zur Vermeidung von Hydration-Mismatches (Server rendert null,
    // Client entscheidet pathname-abhängig). Reines Mount-Synchronisations-Pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Header nicht auf Admin-Seiten anzeigen
  if (!mounted) {
    return null;
  }

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

