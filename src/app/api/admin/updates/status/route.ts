import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { readFileSync, existsSync } from "fs";
import { STATUS_FILE, LOG_FILE, UpdateStatus } from "@/lib/updates/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liefert die letzten N Zeilen einer (ggf. großen) Textdatei. */
function tailLines(filePath: string, maxLines: number): string {
  if (!existsSync(filePath)) return "";
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  return lines.slice(-maxLines).join("\n").trim();
}

/**
 * GET /api/admin/updates/status
 *
 * Liest `.update/status.json` + die letzten Zeilen des Update-Logs für das
 * Polling im UI. Existiert noch kein Status (nie ein Update gestartet),
 * wird `state: "idle"` geliefert. Nur für ADMIN.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    if (!existsSync(STATUS_FILE)) {
      return NextResponse.json({ state: "idle", logTail: "" });
    }

    let status: Partial<UpdateStatus> = {};
    try {
      status = JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
    } catch {
      // Datei evtl. mitten im Schreiben → als laufend behandeln
      status = { state: "running", message: "Status wird aktualisiert …" };
    }

    const logTail = tailLines(LOG_FILE, 200);

    return NextResponse.json({ ...status, logTail });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Lesen des Update-Status:", error);
    return NextResponse.json(
      { error: "Status konnte nicht gelesen werden.", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
