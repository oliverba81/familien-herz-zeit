/**
 * Consent Types
 */

export interface Consent {
  necessary: boolean; // Immer true
  statistics: boolean;
  marketing: boolean;
  updatedAt: string; // ISO String
}

export const DEFAULT_CONSENT: Consent = {
  necessary: true,
  statistics: false,
  marketing: false,
  updatedAt: new Date(0).toISOString(),
};



