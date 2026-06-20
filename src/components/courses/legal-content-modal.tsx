"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PageRenderer from "@/components/page-renderer/page-renderer";
import LegalHtmlContent from "@/components/page-renderer/legal-html-content";
import type { PageContentV1 } from "@/lib/page-builder/schema";

interface PageContentResponse {
  title: string;
  showTitle: boolean;
  customCss: string | null;
  isV2: boolean;
  html: string | null;
  content: PageContentV1 | null;
}

interface LegalContentModalProps {
  /** Slug der anzuzeigenden Seite, z. B. "datenschutzerklaerung" */
  slug: string;
  /** Fallback-Titel, falls die Seite noch nicht geladen ist */
  title: string;
  /** Ob das Popup geöffnet ist */
  open: boolean;
  /** Wird aufgerufen, wenn das Popup geschlossen werden soll */
  onClose: () => void;
}

export default function LegalContentModal({
  slug,
  title,
  open,
  onClose,
}: LegalContentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PageContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Inhalt laden, sobald das Popup geöffnet wird.
  // WICHTIG: Nur von [open, slug] abhängig. isLoading/data dürfen NICHT in den
  // Dependencies stehen – sonst löst setIsLoading(true) sofort die Cleanup aus
  // (cancelled=true), bevor der fetch zurückkommt, und der Inhalt wird nie
  // gesetzt ("Wird geladen …" bleibt für immer stehen).
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/pages/public/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Inhalt konnte nicht geladen werden.");
        }
        return res.json();
      })
      .then((result: PageContentResponse) => {
        if (!cancelled) setData(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  // ESC-Taste schließt das Popup + Body-Scroll sperren, solange offen
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={data?.title || title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {data?.title || title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {data?.customCss && (
            <style dangerouslySetInnerHTML={{ __html: data.customCss }} />
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-rose-500" />
              <span className="ml-3 text-sm">Wird geladen …</span>
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-sm text-red-600">
              <p>{error}</p>
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-rose-500 underline hover:text-rose-600"
              >
                Seite in neuem Tab öffnen
              </a>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {data.isV2 && data.html !== null ? (
                <LegalHtmlContent html={data.html} />
              ) : data.content ? (
                <PageRenderer content={data.content} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
