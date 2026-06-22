import { vi } from "vitest";

/**
 * Minimaler Prisma-Mock für Unit-Tests von DB-abhängigem Code (kein Test-DB in CI).
 * Nutzung: `vi.mock("@/lib/db", () => ({ db: mockDb }))` + `resetPrismaMock()` in beforeEach.
 */
export const mockDb = {
  page: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  pageRevision: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  reusableBlock: {
    findUnique: vi.fn(),
  },
};

export function resetPrismaMock(): void {
  for (const model of Object.values(mockDb)) {
    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
}
