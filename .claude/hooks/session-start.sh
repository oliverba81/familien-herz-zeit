#!/bin/bash
# SessionStart-Hook: bereitet Web-Sessions vor, sodass Tests, Typecheck und
# Lint sofort lauffaehig sind. Idempotent, non-interaktiv, scheitert nie
# (damit der Session-Start nie blockiert wird).
set -uo pipefail

# Nur in der entfernten Web-Umgebung ausfuehren (lokal nicht noetig).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

# prisma.config.ts wertet env("DATABASE_URL") schon beim Laden hart aus.
# Ohne Variable bricht jedes prisma-Kommando mit PrismaConfigEnvError ab.
# Eine echte DB-Verbindung wird fuer `prisma generate` nicht aufgebaut.
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/db}"

# 1. Abhaengigkeiten installieren (npm install nutzt den Container-Cache besser
#    als npm ci; nur wenn node_modules fehlt -> idempotent).
if [ ! -d node_modules ]; then
  npm install || echo "[session-start] npm install fehlgeschlagen (ignoriert)"
fi

# 2. Prisma-Client generieren (noetig fuer tsc/Tests, da Source @prisma/client
#    importiert). Mit || true, damit Fehler den Hook nie scheitern lassen.
npx prisma generate >/dev/null 2>&1 || echo "[session-start] prisma generate fehlgeschlagen (ignoriert)"

exit 0
