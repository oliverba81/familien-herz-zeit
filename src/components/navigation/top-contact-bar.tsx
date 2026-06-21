"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface TopBarItem {
  type: "phone" | "email" | "text" | "link";
  label: string;
  value: string;
  href?: string;
}

interface TopBarConfig {
  enabled: boolean;
  backgroundColor: string;
  textColor: string;
  height: number;
  items: TopBarItem[];
}

export default function TopContactBar() {
  const pathname = usePathname();
  const [config, setConfig] = useState<TopBarConfig | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mount-Flag zur Vermeidung von Hydration-Mismatches (Server rendert null).
    // Reines Mount-Synchronisations-Pattern; die folgende fetch-Logik setzt State
    // ausschließlich in asynchronen Callbacks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Lade Settings beim Mount
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
          try {
            const topBarConfigJson = data.top_bar_config;
            if (topBarConfigJson) {
              const parsed = JSON.parse(topBarConfigJson);
              // Backward Compatibility: Wenn height nicht gesetzt, Standard-Wert verwenden
              if (!parsed.height) {
                parsed.height = 40;
              }
              setConfig(parsed);
            } else {
            // Fallback zu Standard-Werten
            setConfig({
              enabled: true,
              backgroundColor: "#2563eb", // blue-600
              textColor: "#ffffff",
              height: 40,
              items: [
                {
                  type: "phone",
                  label: "0174 / 837 24 63",
                  value: "01748372463",
                },
                {
                  type: "email",
                  label: "info@familien-herz-zeit.de",
                  value: "info@familien-herz-zeit.de",
                },
              ],
            });
          }
        } catch (error) {
          console.error("Fehler beim Parsen der Top-Bar Config:", error);
          // Fallback zu Standard-Werten
          setConfig({
            enabled: true,
            backgroundColor: "#2563eb",
            textColor: "#ffffff",
            height: 40,
            items: [
              {
                type: "phone",
                label: "0174 / 837 24 63",
                value: "01748372463",
              },
              {
                type: "email",
                label: "info@familien-herz-zeit.de",
                value: "info@familien-herz-zeit.de",
              },
            ],
          });
        }
      })
      .catch((err) => console.error("Fehler beim Laden der Settings:", err));
  }, []);

  // Nicht auf Admin-Seiten anzeigen
  if (!mounted || pathname?.startsWith("/admin")) {
    return null;
  }

  // Wenn nicht aktiviert oder keine Config, nichts anzeigen
  if (!config || !config.enabled || !config.items || config.items.length === 0) {
    return null;
  }

  const renderItem = (item: TopBarItem, index: number) => {
    const baseClasses = "hover:opacity-80 transition-opacity flex items-center gap-1";
    
    if (item.type === "phone") {
      return (
        <a
          key={index}
          href={`tel:${item.value}`}
          className={baseClasses}
        >
          <span>☎</span>
          <span>{item.label}</span>
        </a>
      );
    }

    if (item.type === "email") {
      return (
        <a
          key={index}
          href={`mailto:${item.value}`}
          className={baseClasses}
        >
          <span>✉</span>
          <span>{item.label}</span>
        </a>
      );
    }

    if (item.type === "link" && item.href) {
      return (
        <a
          key={index}
          href={item.href}
          className={baseClasses}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          <span>{item.label}</span>
        </a>
      );
    }

    // Text-Item
    return (
      <span key={index} className="flex items-center gap-1">
        <span>{item.label}</span>
      </span>
    );
  };

  const height = config.height || 40; // Fallback zu 40px wenn nicht gesetzt

  return (
    <div
      className="text-xs sm:text-sm"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        height: `${height}px`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-center sm:justify-end items-center h-full gap-3 sm:gap-6 flex-wrap">
          {config.items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}

