import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { checkForUpdate, getChangelog } from "@/lib/updates/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/updates/check
 *
 * Prüft, ob auf GitHub neuere Commits vorliegen (lokaler HEAD vs. origin/main)
 * und liefert zugleich den Changelog (letzte 20 Commits) mit. `checkForUpdate`
 * und `getChangelog` rufen jeweils `git fetch` auf; wir bündeln beides hier,
 * damit das UI nur einen Request braucht.
 *
 * Nur für ADMIN. Plattformneutral (nur `git`), läuft auch lokal unter Windows.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const check = await checkForUpdate();
    const changelog = await getChangelog(20);

    return NextResponse.json({ ...check, changelog });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler bei der Update-Prüfung:", error);
    return NextResponse.json(
      {
        error:
          "Update-Prüfung fehlgeschlagen. Ist Git installiert und der Remote-Zugang konfiguriert?",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
