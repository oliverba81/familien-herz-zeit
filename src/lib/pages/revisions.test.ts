import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockDb, resetPrismaMock } from "@/test/prisma-mock";

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  createPageRevision,
  listPageRevisions,
  restorePageRevision,
  REVISION_RETENTION,
} from "./revisions";

beforeEach(() => resetPrismaMock());

describe("createPageRevision", () => {
  it("legt einen Snapshot an", async () => {
    mockDb.pageRevision.create.mockResolvedValue({ id: "r1" });
    mockDb.pageRevision.findMany.mockResolvedValue([]); // kein Überschuss
    await createPageRevision("p1", { version: 3 }, { label: "Veröffentlicht" });
    expect(mockDb.pageRevision.create).toHaveBeenCalledWith({
      data: { pageId: "p1", contentJson: { version: 3 }, label: "Veröffentlicht", createdById: null },
    });
  });

  it("kappt die Historie auf REVISION_RETENTION (älteste raus)", async () => {
    mockDb.pageRevision.create.mockResolvedValue({ id: "rNew" });
    mockDb.pageRevision.findMany.mockResolvedValue([{ id: "old1" }, { id: "old2" }]);
    await createPageRevision("p1", { version: 3 });
    expect(mockDb.pageRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pageId: "p1" }, skip: REVISION_RETENTION })
    );
    expect(mockDb.pageRevision.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old1", "old2"] } },
    });
  });

  it("löscht nichts, wenn kein Überschuss", async () => {
    mockDb.pageRevision.create.mockResolvedValue({ id: "rNew" });
    mockDb.pageRevision.findMany.mockResolvedValue([]);
    await createPageRevision("p1", { version: 3 });
    expect(mockDb.pageRevision.deleteMany).not.toHaveBeenCalled();
  });
});

describe("listPageRevisions", () => {
  it("gibt Metadaten neueste zuerst zurück", async () => {
    const rows = [{ id: "r2", label: null, createdById: null, createdAt: new Date() }];
    mockDb.pageRevision.findMany.mockResolvedValue(rows);
    const out = await listPageRevisions("p1");
    expect(out).toBe(rows);
    expect(mockDb.pageRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pageId: "p1" }, orderBy: { createdAt: "desc" } })
    );
  });
});

describe("restorePageRevision", () => {
  it("schreibt den Inhalt in den Entwurf und gibt ihn zurück", async () => {
    const content = { version: 3, root: {}, content: [] };
    mockDb.pageRevision.findUnique.mockResolvedValue({ pageId: "p1", contentJson: content });
    mockDb.page.update.mockResolvedValue({});
    const out = await restorePageRevision("p1", "r1");
    expect(out).toEqual(content);
    expect(mockDb.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { draftContentJson: content },
    });
  });

  it("wirft, wenn die Version nicht zur Seite gehört", async () => {
    mockDb.pageRevision.findUnique.mockResolvedValue({ pageId: "andere", contentJson: {} });
    await expect(restorePageRevision("p1", "r1")).rejects.toThrow(/nicht gefunden/);
    expect(mockDb.page.update).not.toHaveBeenCalled();
  });

  it("wirft, wenn die Version fehlt", async () => {
    mockDb.pageRevision.findUnique.mockResolvedValue(null);
    await expect(restorePageRevision("p1", "r1")).rejects.toThrow(/nicht gefunden/);
  });
});
