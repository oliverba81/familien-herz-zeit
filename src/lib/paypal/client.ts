/**
 * PayPal Client Helper
 * Server-only utilities for PayPal API interactions
 */

// Unterstütze sowohl PAYPAL_MODE (aus Admin-Form) als auch PAYPAL_ENV (für Backward Compatibility)
const PAYPAL_MODE = (process.env.PAYPAL_MODE || process.env.PAYPAL_ENV || "sandbox") as "sandbox" | "live";

function getPaypalBaseUrl(): string {
  return PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get PayPal OAuth2 Access Token
 * Uses in-memory cache (dev ok, production should use Redis)
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
  }

  const baseUrl = getPaypalBaseUrl();
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
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
  const baseUrl = getPaypalBaseUrl();
  const token = await getAccessToken();

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

export { getPaypalBaseUrl };

