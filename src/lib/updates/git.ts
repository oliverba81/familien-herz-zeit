import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Update-/Git-Helfer (Server-only).
 *
 * Alle Git-Aufrufe laufen plattformneutral über `execFile("git", ...)` (nicht über bash),
 * damit sie sowohl lokal (Windows-Dev, falls Git installiert) als auch auf dem Linux-Server
 * funktionieren. `GIT_TERMINAL_PROMPT=0` verhindert, dass git bei fehlenden Credentials
 * interaktiv nachfragt und der Prozess hängt.
 */

const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
};

const BRANCH = "main";
const REMOTE = "origin";

/** Eindeutige, im Commit-Text unwahrscheinliche Trennzeichen für sicheres Parsen. */
const FIELD_SEP = "\x1f"; // Unit Separator
const RECORD_SEP = "\x1e"; // Record Separator

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    env: GIT_ENV,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

/** Holt den aktuellen Stand von origin (kann bei fehlenden Credentials/Netzwerk werfen). */
export async function fetchRemote(): Promise<void> {
  await git(["fetch", REMOTE, "--prune"]);
}

export interface UpdateCheckResult {
  current: string;
  latest: string;
  currentShort: string;
  latestShort: string;
  behind: number;
  upToDate: boolean;
  currentSubject: string;
  currentDate: string;
}

/**
 * Vergleicht den lokalen HEAD mit origin/main. Ruft vorab `git fetch` auf.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  await fetchRemote();

  const current = await git(["rev-parse", "HEAD"]);
  const latest = await git(["rev-parse", `${REMOTE}/${BRANCH}`]);
  const currentShort = await git(["rev-parse", "--short", "HEAD"]);
  const latestShort = await git(["rev-parse", "--short", `${REMOTE}/${BRANCH}`]);

  let behind = 0;
  try {
    const countStr = await git([
      "rev-list",
      "--count",
      `HEAD..${REMOTE}/${BRANCH}`,
    ]);
    behind = parseInt(countStr, 10) || 0;
  } catch {
    behind = 0;
  }

  // Betreff + ISO-Datum des aktuell installierten Commits
  const headInfo = await git([
    "show",
    "-s",
    `--format=%s${FIELD_SEP}%cI`,
    "HEAD",
  ]);
  const [currentSubject = "", currentDate = ""] = headInfo.split(FIELD_SEP);

  return {
    current,
    latest,
    currentShort,
    latestShort,
    behind,
    upToDate: current === latest,
    currentSubject,
    currentDate,
  };
}

export interface ChangelogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Letzte N Commits von origin/main (Default 20). Ruft vorab `git fetch` auf, damit der
 * Remote-Stand aktuell ist.
 */
export async function getChangelog(limit = 20): Promise<ChangelogEntry[]> {
  await fetchRemote();

  const format = [
    "%H", // full sha
    "%h", // short sha
    "%an", // author name
    "%cI", // committer date, ISO 8601
    "%s", // subject
  ].join(FIELD_SEP);

  const out = await git([
    "log",
    `${REMOTE}/${BRANCH}`,
    `-n`,
    String(limit),
    `--pretty=format:${format}${RECORD_SEP}`,
  ]);

  if (!out) return [];

  return out
    .split(RECORD_SEP)
    .map((rec) => rec.replace(/^\n/, "").trim())
    .filter(Boolean)
    .map((rec) => {
      const [sha = "", shortSha = "", author = "", date = "", message = ""] =
        rec.split(FIELD_SEP);
      return { sha, shortSha, author, date, message };
    });
}

/** Aktueller HEAD-SHA (ohne fetch). */
export async function getCurrentSha(): Promise<string> {
  return git(["rev-parse", "HEAD"]);
}
