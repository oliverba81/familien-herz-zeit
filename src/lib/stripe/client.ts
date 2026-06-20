import Stripe from "stripe";
import { getPaymentConfig } from "@/lib/payment/config";

// Lazy + key-bewusste Initialisierung: Wird der Secret Key im Admin geändert,
// erzeugen wir die Instanz neu (kein Server-Neustart nötig).
let stripeInstance: Stripe | null = null;
let stripeInstanceKey: string | null = null;

/**
 * Gibt die konfigurierte Stripe-Instanz zurück.
 * Liest den Secret Key aus der Zahlungs-Konfiguration (DB > .env).
 */
export async function getStripe(): Promise<Stripe> {
  const { stripe } = await getPaymentConfig();
  const secretKey = stripe.secretKey;

  if (!secretKey) {
    throw new Error(
      "Stripe ist nicht konfiguriert (kein Secret Key hinterlegt)"
    );
  }

  if (!stripeInstance || stripeInstanceKey !== secretKey) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
    });
    stripeInstanceKey = secretKey;
  }

  return stripeInstance;
}

/**
 * Webhook-Signing-Secret (DB > .env), null wenn nicht gesetzt.
 */
export async function getStripeWebhookSecret(): Promise<string | null> {
  const { stripe } = await getPaymentConfig();
  return stripe.webhookSecret;
}
