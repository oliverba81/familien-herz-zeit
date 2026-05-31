import { randomBytes } from "crypto";

/**
 * Generiert einen sicheren, URL-freundlichen Token
 * @param bytes Anzahl der Bytes (Standard: 32)
 * @returns URL-safe Base64-String
 */
export function generateToken(bytes: number = 32): string {
  const buffer = randomBytes(bytes);
  // Konvertiere zu base64url (URL-safe)
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

