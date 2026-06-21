"use client";

import { useEffect, useState } from "react";
import type { SerializableCourse } from "@/lib/courses/published-courses";

/**
 * Modul-globaler Promise-Cache: mehrere Embeds teilen sich EINEN Fetch pro
 * Editor-Session. Nur erfolgreiche Promises werden gecacht – bei Fehlern wird
 * der Cache zurückgesetzt, damit ein erneuter Mount neu lädt.
 */
let cache: Promise<SerializableCourse[]> | null = null;

function fetchPublishedCoursesOnce(): Promise<SerializableCourse[]> {
  if (!cache) {
    cache = fetch("/api/embed/courses", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("Kurse konnten nicht geladen werden");
        return res.json();
      })
      .then((json) => (json.courses ?? []) as SerializableCourse[])
      .catch((err) => {
        cache = null; // Retry beim nächsten Mount erlauben
        throw err;
      });
  }
  return cache;
}

export interface UsePublishedCoursesResult {
  courses: SerializableCourse[] | null;
  error: string | null;
  loading: boolean;
}

export function usePublishedCourses(): UsePublishedCoursesResult {
  const [courses, setCourses] = useState<SerializableCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishedCoursesOnce()
      .then((c) => {
        if (active) setCourses(c);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Fehler beim Laden");
      });
    return () => {
      active = false;
    };
  }, []);

  return { courses, error, loading: courses === null && error === null };
}
