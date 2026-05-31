"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Consent, DEFAULT_CONSENT } from "@/lib/consent/types";
import { getConsentFromCookie, setConsentCookie } from "@/lib/consent/storage";

interface ConsentContextType {
  consent: Consent;
  setConsent: (consent: Consent) => void;
  hasConsent: (category: "statistics" | "marketing") => boolean;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return context;
}

interface ConsentProviderProps {
  children: ReactNode;
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  const [consent, setConsentState] = useState<Consent>(DEFAULT_CONSENT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lade Consent aus Cookie beim Mount
    const cookieConsent = getConsentFromCookie();
    if (cookieConsent) {
      setConsentState(cookieConsent);
    }
  }, []);

  const setConsent = (newConsent: Consent) => {
    setConsentState(newConsent);
    setConsentCookie(newConsent);
  };

  const hasConsent = (category: "statistics" | "marketing"): boolean => {
    return consent[category] === true;
  };

  // Immer Context bereitstellen, auch während SSR
  // Während SSR wird DEFAULT_CONSENT verwendet, nach Mount wird es aus Cookie geladen
  return (
    <ConsentContext.Provider value={{ consent, setConsent, hasConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

