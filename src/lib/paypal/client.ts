/**
 * PayPal Client Helper
 * Server-only utilities for PayPal API interactions.
 *
 * Liest Client-ID/Secret/Modus aus der zentralen Zahlungs-Konfiguration
 * (DB > .env, siehe src/lib/payment/config.ts).
 */
import { getPaymentConfig, type PaypalConfig } from "@/lib/payment/config";

function baseUrlForMode(mode: "sandbox" | "live"): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Token-Cache, geschlüsselt nach Credentials+Modus, damit ein Wechsel der
// Konfiguration im Admin nicht zu einem veralteten Token führt.
let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

function credKey(cfg: PaypalConfig): string {
  return `${cfg.mode}:${cfg.clientId ?? ""}`;
}

async function getPaypalConfigOrThrow(): Promise<PaypalConfig> {
  const { paypal } = await getPaymentConfig();
  if (!paypal.clientId || !paypal.clientSecret) {
    throw new Error("PayPal ist nicht konfiguriert (Client-ID/Secret fehlen)");
  }
  return paypal;
}

/**
 * Get PayPal OAuth2 Access Token
 * Uses in-memory cache (dev ok, production should use Redis)
 */
async function getAccessToken(cfg: PaypalConfig): Promise<string> {
  const key = credKey(cfg);

  // Return cached token if still valid (with 60s buffer) und gleiche Credentials
  if (
    cachedToken &&
    cachedToken.key === key &&
    cachedToken.expiresAt > Date.now() + 60000
  ) {
    return cachedToken.token;
  }

  const baseUrl = baseUrlForMode(cfg.mode);
  const auth = Buffer.from(
    `${cfg.clientId}:${cfg.clientSecret}`
  ).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth failed: ${response.status} ${errorText}`);
  }

  const data: AccessTokenResponse = await response.json();

  // Cache token
  cachedToken = {
    key,
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // -60s buffer
  };

  return data.access_token;
}

/**
 * PayPal API fetch helper
 * Automatically injects access token
 */
export async function paypalFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const cfg = await getPaypalConfigOrThrow();
  const baseUrl = baseUrlForMode(cfg.mode);
  const token = await getAccessToken(cfg);

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `PayPal API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error_description || errorMessage;
    } catch {
      errorMessage += ` ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

/**
 * Aktuelle PayPal-Basis-URL (abhängig vom konfigurierten Modus).
 */
export async function getPaypalBaseUrl(): Promise<string> {
  const { paypal } = await getPaymentConfig();
  return baseUrlForMode(paypal.mode);
}
