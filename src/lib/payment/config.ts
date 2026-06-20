/**
 * Zentrale Zahlungs-Konfiguration.
 *
 * Liest die in der Datenbank (Modell `PaymentSettings`, verwaltet im Admin unter
 * "Zahlungseinstellungen") hinterlegten Werte. Fehlt ein Wert in der DB, wird auf
 * die entsprechende Umgebungsvariable zurückgegriffen. So funktioniert eine
 * bestehende .env-Konfiguration weiter, bis der Admin die Werte in der DB pflegt.
 *
 * Server-only: Diese Datei nie in Client-Komponenten importieren (enthält Secrets).
 */
import { db } from "@/lib/db";

export type PaymentMethod = "stripe" | "paypal" | "bankTransfer";

export interface StripeConfig {
  /** Admin-Schalter: Zahlungsart aktiviert? */
  enabled: boolean;
  secretKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
  /** Notwendige Keys vorhanden? */
  configured: boolean;
  /** Im Checkout anbietbar (aktiviert UND konfiguriert)? */
  available: boolean;
}

export interface PaypalConfig {
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  mode: "sandbox" | "live";
  configured: boolean;
  available: boolean;
}

export interface BankTransferConfig {
  enabled: boolean;
  accountHolder: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  info: string | null;
  /** Mindestangaben (Kontoinhaber + IBAN) vorhanden? */
  configured: boolean;
  available: boolean;
}

export interface PaymentConfig {
  stripe: StripeConfig;
  paypal: PaypalConfig;
  bankTransfer: BankTransferConfig;
}

/** Trimmt Whitespace und evtl. umschließende Anführungszeichen, gibt null bei leer. */
function clean(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/^["']|["']$/g, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Lädt die effektive Zahlungs-Konfiguration (DB > .env).
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  let row: Awaited<ReturnType<typeof db.paymentSettings.findFirst>> = null;
  try {
    row = await db.paymentSettings.findFirst();
  } catch {
    // Tabelle evtl. noch nicht migriert -> reiner .env-Fallback
    row = null;
  }

  // --- Stripe ---
  const stripeSecretKey =
    clean(row?.stripeSecretKey) ?? clean(process.env.STRIPE_SECRET_KEY);
  const stripePublishableKey =
    clean(row?.stripePublishableKey) ?? clean(process.env.STRIPE_PUBLISHABLE_KEY);
  const stripeWebhookSecret =
    clean(row?.stripeWebhookSecret) ?? clean(process.env.STRIPE_WEBHOOK_SECRET);
  const stripeConfigured = !!stripeSecretKey;
  // Aktivierung kommt ausschließlich aus dem Admin-Schalter (Default: aus).
  // Keys dürfen aus der .env stammen, aber angeboten wird nur, was aktiviert ist.
  const stripeEnabled = row?.stripeEnabled ?? false;

  // --- PayPal ---
  const paypalClientId =
    clean(row?.paypalClientId) ?? clean(process.env.PAYPAL_CLIENT_ID);
  const paypalClientSecret =
    clean(row?.paypalClientSecret) ?? clean(process.env.PAYPAL_CLIENT_SECRET);
  const paypalModeRaw =
    clean(row?.paypalMode) ??
    clean(process.env.PAYPAL_MODE) ??
    clean(process.env.PAYPAL_ENV) ??
    "sandbox";
  const paypalMode: "sandbox" | "live" =
    paypalModeRaw === "live" ? "live" : "sandbox";
  const paypalConfigured = !!(paypalClientId && paypalClientSecret);
  const paypalEnabled = row?.paypalEnabled ?? false;

  // --- Überweisung ---
  const bankAccountHolder = clean(row?.bankAccountHolder);
  const bankIban = clean(row?.bankIban);
  const bankBic = clean(row?.bankBic);
  const bankName = clean(row?.bankName);
  const bankTransferInfo = clean(row?.bankTransferInfo);
  const bankConfigured = !!(bankAccountHolder && bankIban);
  const bankEnabled = row?.bankTransferEnabled ?? false;

  return {
    stripe: {
      enabled: stripeEnabled,
      secretKey: stripeSecretKey,
      publishableKey: stripePublishableKey,
      webhookSecret: stripeWebhookSecret,
      configured: stripeConfigured,
      available: stripeEnabled && stripeConfigured,
    },
    paypal: {
      enabled: paypalEnabled,
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
      mode: paypalMode,
      configured: paypalConfigured,
      available: paypalEnabled && paypalConfigured,
    },
    bankTransfer: {
      enabled: bankEnabled,
      accountHolder: bankAccountHolder,
      iban: bankIban,
      bic: bankBic,
      bankName: bankName,
      info: bankTransferInfo,
      configured: bankConfigured,
      available: bankEnabled && bankConfigured,
    },
  };
}

/**
 * Nur die für den Checkout anbietbaren Methoden (ohne Secrets) – für UI/Gating.
 */
export async function getAvailablePaymentMethods(): Promise<{
  stripe: boolean;
  paypal: boolean;
  bankTransfer: boolean;
}> {
  const cfg = await getPaymentConfig();
  return {
    stripe: cfg.stripe.available,
    paypal: cfg.paypal.available,
    bankTransfer: cfg.bankTransfer.available,
  };
}
