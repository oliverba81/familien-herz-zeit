import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logging/logger";
import { getCurrentSha } from "@/lib/updates/git";
import {
  UPDATE_DIR,
  STATUS_FILE,
  LOG_FILE,
  STALE_LOCK_MS,
  UpdateStatus,
} from "@/lib/updates/status";
import { spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  copyFileSync,
  openSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prüft, ob bereits ein Update läuft. Ein `running`-Status, der älter als
 * STALE_LOCK_MS ist (Server evtl. abgestürzt), gilt als veraltet → kein Lock.
 */
function isUpdateRunning(): boolean {
  if (!existsSync(STATUS_FILE)) return false;
  try {
    const status: Partial<UpdateStatus> = JSON.parse(
      readFileSync(STATUS_FILE, "utf-8")
    );
    if (status.state !== "running") return false;
    const startedAt = status.startedAt ? Date.parse(status.startedAt) : NaN;
    if (Number.isFinite(startedAt) && Date.now() - startedAt > STALE_LOCK_MS) {
      return false; // Stale Lock → neuen Lauf zulassen
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/admin/updates/apply
 *
 * Startet den Self-Update-Prozess als detachten Hintergrundprozess. Achtung:
 * Apply ist SERVER-/LINUX-ONLY (bash + pm2). Unter Windows-Dev schlägt der
 * Hintergrundprozess erwartbar fehl (im Status-Log sichtbar), die Route selbst
 * crasht aber nicht. Nur für ADMIN.
 */
export async function POST(_request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    // Doppelstart-/Stale-Lock-Schutz
    if (isUpdateRunning()) {
      return NextResponse.json(
        { error: "Es läuft bereits ein Update.", started: false },
        { status: 409 }
      );
    }

    // Aktuellen Commit für Logging/Status erfassen (vor dem reset --hard).
    let fromSha = "";
    try {
      fromSha = await getCurrentSha();
    } catch {
      fromSha = "";
    }

    // .update/ vorbereiten
    if (!existsSync(UPDATE_DIR)) {
      mkdirSync(UPDATE_DIR, { recursive: true });
    }

    // Skript nach os.tmpdir() kopieren, damit `git reset --hard` die laufende
    // Skriptdatei nicht überschreibt.
    const srcScript = join(process.cwd(), "scripts", "self-update.sh");
    if (!existsSync(srcScript)) {
      return NextResponse.json(
        { error: "Update-Skript nicht gefunden: scripts/self-update.sh", started: false },
        { status: 500 }
      );
    }
    const tmpScript = join(tmpdir(), `fhz-self-update-${Date.now()}.sh`);
    copyFileSync(srcScript, tmpScript);

    // Logfile im Truncate-Modus öffnen (ein FD pro Lauf, kein Anwachsen).
    const logFd = openSync(LOG_FILE, "w");

    // Detachter Hintergrundprozess über Login-Shell (PATH für npm/npx/pm2).
    const child = spawn("bash", ["-l", tmpScript, process.cwd(), fromSha], {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: process.cwd(),
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    child.unref();

    await logger.info(
      "SYSTEM",
      "UPDATE_STARTED",
      "Self-Update über Admin-Oberfläche gestartet",
      { fromSha }
    );

    return NextResponse.json({ started: true, fromSha });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    await logger.error(
      "SYSTEM",
      "UPDATE_START_ERROR",
      "Fehler beim Starten des Self-Updates",
      error as Error
    );
    return NextResponse.json(
      { error: "Update konnte nicht gestartet werden.", details: error?.message ?? String(error), started: false },
      { status: 500 }
    );
  }
}
