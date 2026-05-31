import Stripe from "stripe";

// Lazy initialization to avoid errors during build if env var is missing
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY.trim();
    // Entferne Anführungszeichen falls vorhanden
    const cleanKey = secretKey.replace(/^["']|["']$/g, '');
    stripeInstance = new Stripe(cleanKey, {
      apiVersion: "2025-12-15.clover",
    });
  }

  return stripeInstance;
}

// Export stripe - wird erst beim ersten Aufruf von getStripe() initialisiert
// Verwende getStripe() direkt in den API-Routen für bessere Kontrolle
export const stripe = getStripe();

