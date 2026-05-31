import { join } from "path";

/**
 * Gemeinsame Pfade/Typen für den Self-Update-Status (Server-only).
 *
 * Das Bash-Skript `scripts/self-update.sh` schreibt nach `.update/status.json`
 * und `.update/update.log` im Projekt-Root; die API-Routen lesen von hier.
 */

export const UPDATE_DIR = join(process.cwd(), ".update");
export const STATUS_FILE = join(UPDATE_DIR, "status.json");
export const LOG_FILE = join(UPDATE_DIR, "update.log");

export type UpdateState = "idle" | "running" | "success" | "error";

export interface UpdateStatus {
  state: UpdateState;
  step: string;
  message: string;
  startedAt: string;
  finishedAt: string;
  fromSha: string;
  toSha: string;
}

/** Stale-Lock-Grenze: Ein `running`-Status älter als das gilt als veraltet. */
export const STALE_LOCK_MS = 30 * 60 * 1000; // 30 Minuten
