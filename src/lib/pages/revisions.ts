import { db } from "@/lib/db";

/**
 * Versionshistorie (Feature 6). Snapshots werden bei manuellem Speichern + Publish
 * angelegt (NICHT bei Autosave), als post-Migration-Inhalt (Puck v3 / V1 / V2).
 */

/** Max. behaltene Versionen pro Seite (Prune-on-Write). */
export const REVISION_RETENTION = 30;

export interface RevisionMeta {
  id: string;
  label: string | null;
  createdById: string | null;
  createdAt: Date;
}

/**
 * Legt einen Snapshot an und kappt die Historie auf REVISION_RETENTION (älteste raus).
 */
export async function createPageRevision(
  pageId: string,
  contentJson: unknown,
  opts?: { label?: string | null; createdById?: string | null }
): Promise<void> {
  await db.pageRevision.create({
    data: {
      pageId,
      contentJson: contentJson as object,
      label: opts?.label ?? null,
      createdById: opts?.createdById ?? null,
    },
  });

  // Prune: alles jenseits der letzten REVISION_RETENTION entfernen.
  const surplus = await db.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    skip: REVISION_RETENTION,
    select: { id: true },
  });
  if (surplus.length > 0) {
    await db.pageRevision.deleteMany({
      where: { id: { in: surplus.map((r) => r.id) } },
    });
  }
}

/** Liste der Versionen (neueste zuerst), ohne Inhalt. */
export async function listPageRevisions(pageId: string): Promise<RevisionMeta[]> {
  return db.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdById: true, createdAt: true },
  });
}

/**
 * Stellt eine Version wieder her: schreibt deren Inhalt in den Entwurf (draftContentJson).
 * Gibt den wiederhergestellten Inhalt zurück. Wirft, wenn die Version nicht zur Seite gehört.
 */
export async function restorePageRevision(
  pageId: string,
  revisionId: string
): Promise<unknown> {
  const rev = await db.pageRevision.findUnique({
    where: { id: revisionId },
    select: { pageId: true, contentJson: true },
  });
  if (!rev || rev.pageId !== pageId) {
    throw new Error("Version nicht gefunden");
  }
  await db.page.update({
    where: { id: pageId },
    data: { draftContentJson: rev.contentJson as object },
  });
  return rev.contentJson;
}
