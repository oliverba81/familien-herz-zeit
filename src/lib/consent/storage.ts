"use client";

import { Consent, DEFAULT_CONSENT } from "./types";

const CONSENT_COOKIE_NAME = "fhz_consent";
const CONSENT_COOKIE_MAX_AGE = 180 * 24 * 60 * 60; // 180 Tage

/**
 * Liest Consent aus Cookie
 */
export function getConsentFromCookie(): Consent | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const consentCookie = cookies.find((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!consentCookie) return null;

  try {
    const value = consentCookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    const consent = JSON.parse(decoded) as Consent;
    
    // Validiere Consent
    if (typeof consent === "object" && consent !== null) {
      return {
        necessary: true, // Immer true
        statistics: consent.statistics === true,
        marketing: consent.marketing === true,
        updatedAt: consent.updatedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Fehler beim Lesen des Consent Cookies:", error);
  }

  return null;
}

/**
 * Setzt Consent Cookie
 */
export function setConsentCookie(consent: Consent): void {
  if (typeof document === "undefined") return;

  const isProduction = process.env.NODE_ENV === "production";
  const cookieValue = JSON.stringify({
    necessary: true, // Immer true
    statistics: consent.statistics,
    marketing: consent.marketing,
    updatedAt: consent.updatedAt || new Date().toISOString(),
  });

  const expires = new Date();
  expires.setTime(expires.getTime() + CONSENT_COOKIE_MAX_AGE * 1000);

  const cookieString = [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    `expires=${expires.toUTCString()}`,
    `path=/`,
    `SameSite=Lax`,
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");

  document.cookie = cookieString;
}

/**
 * Löscht Consent Cookie
 */
export function clearConsentCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}



