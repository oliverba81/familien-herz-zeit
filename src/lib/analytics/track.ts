"use client";

import { useConsent } from "@/components/consent/consent-provider";

// Global types für Analytics Provider
declare global {
  interface Window {
    _paq?: any[][];
    gtag?: (...args: any[]) => void;
  }
}

type AnalyticsProvider = "none" | "matomo" | "ga4";

function getProvider(): AnalyticsProvider {
  if (typeof window === "undefined") return "none";
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "none";
  return provider as AnalyticsProvider;
}

/**
 * Zentrale Tracking-Funktion
 * Sendet Events an Analytics Provider (nur bei Consent)
 */
export function track(event: string, props?: Record<string, any>): void {
  if (typeof window === "undefined") return;

  // Prüfe Consent (statistics für Analytics Events)
  const consentCookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("fhz_consent="));

  if (!consentCookie) {
    // Kein Consent → kein Tracking
    return;
  }

  try {
    const value = consentCookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    const consent = JSON.parse(decoded);
    
    if (!consent.statistics) {
      // Kein Statistics Consent → kein Tracking
      return;
    }
  } catch (error) {
    // Fehler beim Parsen → kein Tracking
    return;
  }

  const provider = getProvider();

  // Anonymisiere Props (keine PII)
  const anonymizedProps = props ? anonymizeProps(props) : {};

  // Provider-spezifisches Tracking
  switch (provider) {
    case "matomo":
      trackMatomo(event, anonymizedProps);
      break;
    case "ga4":
      trackGA4(event, anonymizedProps);
      break;
    case "none":
    default:
      // Optional: Fallback zu serverseitigem Logging
      trackServer(event, anonymizedProps);
      break;
  }
}

/**
 * Anonymisiert Props (entfernt PII)
 */
function anonymizeProps(props: Record<string, any>): Record<string, any> {
  const anonymized: Record<string, any> = {};
  const piiFields = ["email", "name", "firstName", "lastName", "phone", "address", "city", "zip"];

  for (const [key, value] of Object.entries(props)) {
    const lowerKey = key.toLowerCase();
    if (piiFields.some((pii) => lowerKey.includes(pii))) {
      // PII-Feld → nicht tracken
      continue;
    }
    anonymized[key] = value;
  }

  return anonymized;
}

/**
 * Matomo Tracking
 */
function trackMatomo(event: string, props?: Record<string, any>): void {
  if (typeof window === "undefined" || !window._paq) return;

  // Matomo Event Format: [category, action, name, value]
  window._paq.push([
    "trackEvent",
    "FHZ", // category
    event, // action
    props ? JSON.stringify(props) : undefined, // name (optional)
    undefined, // value (optional)
  ]);
}

/**
 * GA4 Tracking
 */
function trackGA4(event: string, props?: Record<string, any>): void {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", event, props || {});
}

/**
 * Serverseitiges Event Logging (Fallback)
 */
async function trackServer(event: string, props?: Record<string, any>): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        props: props || {},
      }),
    });
  } catch (error) {
    // Fehler beim Server-Tracking → ignorieren (nicht kritisch)
    console.debug("Server tracking failed:", error);
  }
}



