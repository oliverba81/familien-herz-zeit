"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { contentToPuck } from "@/lib/puck/to-puck-data";
import { analyzePuckA11y, type A11yIssue } from "@/lib/puck/a11y";
import { useAutosave } from "./use-autosave";
import type { PageContentPuck } from "@/lib/page-builder/schema";

// Puck ist client-only → ohne SSR laden.
const PuckPageEditor = dynamic(() => import("./puck-page-editor"), {
  ssr: false,
  loading: () => <div className="p-8 text-gray-500">Editor lädt …</div>,
});

export interface PuckBuilderPageFields {
  title: string;
  slug: string;
  published: boolean;
  showTitle: boolean;
  containerWidth: string;
  customCss: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImageUrl: string | null;
}

interface Props {
  pageId: string;
  /** Bestehender Inhalt (V1/V2/Puck) — wird zum Bearbeiten nach Puck konvertiert. */
  initialContent: unknown;
  pageFields: PuckBuilderPageFields;
}

const draftKey = (pageId: string) => `fhz-puck-draft-${pageId}`;

export default function PuckBuilderClient({ pageId, initialContent, pageFields }: Props) {
  // Bestehende Texte einmalig nach Puck konvertieren (nicht-destruktiv).
  const [initialData] = useState<PageContentPuck>(() => contentToPuck(initialContent));
  // Aktive Editor-Daten (wechseln nur bei Recovery → Remount via editorKey).
  const [editorData, setEditorData] = useState<PageContentPuck>(initialData);
  const [editorKey, setEditorKey] = useState(0);
  const latest = useRef<PageContentPuck>(initialData);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [a11y, setA11y] = useState<A11yIssue[]>(() => analyzePuckA11y(initialData));
  const [recovery, setRecovery] = useState<{ data: PageContentPuck; ts: number } | null>(null);

  // Recovery: beim Mount nach lokalem ungespeichertem Entwurf suchen.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey(pageId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { data: PageContentPuck; ts: number };
      if (parsed?.data && JSON.stringify(parsed.data) !== JSON.stringify(initialData)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecovery(parsed);
      }
    } catch {
      // ignorieren
    }
  }, [pageId, initialData]);

  const save = useCallback(
    async (publish: boolean, createRevision: boolean): Promise<void> => {
      setSaving(true);
      try {
        const body = {
          ...pageFields,
          published: publish ? true : pageFields.published,
          draftContentJson: latest.current,
          // Snapshot nur bei manuellem Speichern; bei Publish übernimmt die Publish-Route.
          createRevision: createRevision && !publish,
        };
        const res = await fetch(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Speichern fehlgeschlagen");
        }
        if (publish) {
          const pr = await fetch(`/api/pages/${pageId}/publish`, { method: "POST" });
          if (!pr.ok) throw new Error("Veröffentlichen fehlgeschlagen");
        }
        setDirty(false);
        // Erfolgreich gespeichert → lokalen Recovery-Entwurf verwerfen.
        try {
          window.localStorage.removeItem(draftKey(pageId));
        } catch {
          // ignorieren
        }
        setStatus(publish ? "✓ Veröffentlicht" : "✓ Entwurf gespeichert");
        window.setTimeout(() => setStatus(null), 3000);
      } catch (e) {
        setStatus(`Fehler: ${(e as Error).message}`);
      } finally {
        setSaving(false);
      }
    },
    [pageId, pageFields]
  );

  // Autosave: ohne Snapshot. Manuelles Speichern (Button): mit Snapshot.
  const autosaveDraft = useCallback(() => save(false, false), [save]);
  const saveDraftManual = useCallback(() => save(false, true), [save]);

  useAutosave({ enabled: dirty, isDirty: dirty, isSaving: saving, saveDraft: autosaveDraft });

  const handleChange = useCallback(
    (d: PageContentPuck) => {
      latest.current = d;
      setDirty(true); // nach erstem Mal No-op (React bail-out)
      setA11y(analyzePuckA11y(d));
      // Lokalen Recovery-Entwurf schreiben.
      try {
        window.localStorage.setItem(draftKey(pageId), JSON.stringify({ data: d, ts: Date.now() }));
      } catch {
        // ignorieren (z. B. Quota)
      }
    },
    [pageId]
  );

  const handlePublish = useCallback(() => {
    void save(true, false);
  }, [save]);

  // Versionshistorie laden + wiederherstellen.
  const [revisions, setRevisions] = useState<
    { id: string; label: string | null; createdAt: string }[]
  >([]);
  const loadRevisions = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data.revisions ?? []);
      }
    } catch {
      // ignorieren
    }
  }, [pageId]);

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      try {
        const res = await fetch(`/api/pages/${pageId}/revisions/${revisionId}/restore`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Wiederherstellen fehlgeschlagen");
        const data = await res.json();
        const restored = contentToPuck(data.content);
        setEditorData(restored);
        setEditorKey((k) => k + 1);
        latest.current = restored;
        setDirty(true);
        setA11y(analyzePuckA11y(restored));
        setStatus("✓ Version wiederhergestellt (als Entwurf)");
        window.setTimeout(() => setStatus(null), 3000);
      } catch (e) {
        setStatus(`Fehler: ${(e as Error).message}`);
      }
    },
    [pageId]
  );

  const restoreDraft = useCallback(() => {
    if (!recovery) return;
    setEditorData(recovery.data);
    setEditorKey((k) => k + 1); // Remount → Puck übernimmt die wiederhergestellten Daten
    latest.current = recovery.data;
    setDirty(true);
    setA11y(analyzePuckA11y(recovery.data));
    setRecovery(null);
  }, [recovery]);

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey(pageId));
    } catch {
      // ignorieren
    }
    setRecovery(null);
  }, [pageId]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {recovery && (
        <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-900">
          <span>
            Ungespeicherte Änderungen von{" "}
            {new Date(recovery.ts).toLocaleString("de-DE")} gefunden.
          </span>
          <button
            type="button"
            onClick={restoreDraft}
            className="px-2 py-1 rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-medium"
          >
            Wiederherstellen
          </button>
          <button
            type="button"
            onClick={discardDraft}
            className="px-2 py-1 rounded hover:bg-yellow-100 underline"
          >
            Verwerfen
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
        <span className="text-sm font-medium text-gray-700">
          Visual-Builder: {pageFields.title || pageFields.slug}
        </span>
        {dirty && <span className="text-xs text-orange-600">● ungespeichert</span>}
        {status && <span className="text-xs text-gray-600">{status}</span>}
        {a11y.length > 0 ? (
          <details className="relative text-xs">
            <summary className="cursor-pointer list-none px-2 py-1 rounded bg-amber-100 text-amber-800">
              ♿ {a11y.length} Hinweis{a11y.length === 1 ? "" : "e"}
            </summary>
            <ul className="absolute z-10 mt-1 w-72 max-h-60 overflow-auto rounded-lg border border-amber-200 bg-white p-2 shadow-lg">
              {a11y.map((issue, i) => (
                <li key={i} className="px-1 py-0.5 text-amber-800">
                  • {issue.message}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <span className="text-xs text-green-700">♿ keine A11y-Hinweise</span>
        )}
        <details
          className="relative text-xs ml-auto"
          onToggle={(e) => {
            if ((e.target as HTMLDetailsElement).open) void loadRevisions();
          }}
        >
          <summary className="cursor-pointer list-none px-2 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            🕔 Versionen
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-80 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {revisions.length === 0 ? (
              <p className="px-1 py-2 text-gray-500">Noch keine Versionen.</p>
            ) : (
              <ul className="space-y-1">
                {revisions.map((rev) => (
                  <li key={rev.id} className="flex items-center justify-between gap-2 px-1 py-1">
                    <span className="text-gray-700">
                      {new Date(rev.createdAt).toLocaleString("de-DE")}
                      {rev.label ? ` · ${rev.label}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void restoreRevision(rev.id)}
                      className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                    >
                      Wiederherstellen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
        <button
          type="button"
          onClick={saveDraftManual}
          disabled={saving || !dirty}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-600 text-white disabled:opacity-50"
        >
          {saving ? "Speichert …" : "Entwurf speichern"}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <PuckPageEditor
          key={editorKey}
          data={editorData}
          customCss={pageFields.customCss}
          onChange={handleChange}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
