/**
 * Generiert src/generated/version.ts mit der aktuellen App-Version aus Git.
 *
 * Wird automatisch via npm-Hooks (predev/prebuild) ausgeführt:
 *   node scripts/gen-version.mjs
 *
 * Quelle der Wahrheit: Git-Tags / GitHub-Releases (Semver, z. B. v0.2.0).
 * Ohne Tag wird die Version aus package.json verwendet.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const FALLBACK_REPO_URL = 'https://github.com/oliverba81/familien-herz-zeit';

function git(args) {
  return execSync(`git ${args}`, {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
}

function tryGit(args, fallback = null) {
  try {
    return git(args);
  } catch {
    return fallback;
  }
}

function pkgVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    return `v${pkg.version}`;
  } catch {
    return 'v0.0.0';
  }
}

function normalizeRepoUrl(raw) {
  if (!raw) return FALLBACK_REPO_URL;
  let url = raw.trim();
  // git@github.com:owner/repo(.git) -> https://github.com/owner/repo
  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  url = url.replace(/\.git$/, '');
  return url;
}

function formatBuildDate(isoDate) {
  if (!isoDate) return '';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
}

// --- Git-Infos ermitteln -----------------------------------------------------
const describe = tryGit('describe --tags'); // ohne --always/--dirty (siehe Plan)
const isExactTag = describe !== null && !/-g[0-9a-f]+$/.test(describe);
const version = describe ?? pkgVersion();

const commit = tryGit('rev-parse --short HEAD', 'unknown');
const buildDate = formatBuildDate(tryGit('show -s --format=%cI HEAD', ''));
const repoUrl = normalizeRepoUrl(tryGit('remote get-url origin', FALLBACK_REPO_URL));

const versionUrl = isExactTag
  ? `${repoUrl}/releases/tag/${version}`
  : `${repoUrl}/commit/${commit}`;

const buildInfo = buildDate ? `Commit ${commit} · ${buildDate}` : `Commit ${commit}`;

// --- Modul schreiben ---------------------------------------------------------
const generatedDir = join(rootDir, 'src', 'generated');
mkdirSync(generatedDir, { recursive: true });

const content = `// AUTO-GENERIERT von scripts/gen-version.mjs – nicht manuell bearbeiten.
export const appVersion = {
  version: ${JSON.stringify(version)},
  versionUrl: ${JSON.stringify(versionUrl)},
  buildInfo: ${JSON.stringify(buildInfo)},
} as const;
`;

writeFileSync(join(generatedDir, 'version.ts'), content, 'utf8');
console.log(`[gen-version] ${version} (${commit}) -> src/generated/version.ts`);
