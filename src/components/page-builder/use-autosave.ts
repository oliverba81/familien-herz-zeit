"use client";

import { useEffect, useRef } from "react";

interface UseAutosaveOptions {
  enabled: boolean;
  intervalMs?: number;
  isDirty: boolean;
  isSaving: boolean;
  saveDraft: () => Promise<void>;
}

/**
 * Hook für automatisches Speichern von Drafts
 */
export function useAutosave({
  enabled,
  intervalMs = 25000, // 25 Sekunden
  isDirty,
  isSaving,
  saveDraft,
}: UseAutosaveOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveAttemptRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial: Warte ein bisschen bevor erster Autosave
    const initialDelay = 5000; // 5 Sekunden nach Mount

    const startAutosave = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        // Nur speichern wenn dirty und nicht bereits saving
        if (isDirty && !isSaving) {
          // Prüfe ob letzter Save-Versuch zu kurz her ist (min 10s Abstand)
          const now = new Date();
          if (
            !lastSaveAttemptRef.current ||
            now.getTime() - lastSaveAttemptRef.current.getTime() > 10000
          ) {
            lastSaveAttemptRef.current = now;
            saveDraft().catch((error) => {
              console.error("Autosave error:", error);
            });
          }
        }
      }, intervalMs);
    };

    // Starte nach initialer Verzögerung
    const timeout = setTimeout(startAutosave, initialDelay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, isDirty, isSaving, saveDraft]);
}



