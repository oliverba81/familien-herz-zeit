import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getChangelog } from "@/lib/updates/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/updates/changelog?limit=20
 *
 * Liefert die letzten N Commits von origin/main. `getChangelog` ruft vorab
 * `git fetch` auf, damit der Remote-Stand aktuell ist. Nur für ADMIN.
 *
 * Hinweis: `/check` liefert den Changelog bereits mit; dieser Endpoint existiert
 * für gezieltes Nachladen/Refresh des Changelogs ohne vollständige Prüfung.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const limitParam = request.nextUrl.searchParams.get("limit");
    let limit = parseInt(limitParam ?? "20", 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    const changelog = await getChangelog(limit);

    return NextResponse.json({ changelog });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Laden des Changelogs:", error);
    return NextResponse.json(
      {
        error: "Changelog konnte nicht geladen werden.",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
