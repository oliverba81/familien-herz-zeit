#!/usr/bin/env bash
#
# Self-Update (Server-/Linux-only!)
# =================================
# Wird vom Admin-Endpoint `POST /api/admin/updates/apply` als *detachter*
# Hintergrundprozess gestartet:
#
#   spawn("bash", ["-l", "<tmp-kopie-dieses-skripts>"], { detached: true, ... })
#
# WICHTIG:
#  * Das Skript wird vor dem Start nach `os.tmpdir()` kopiert und von dort
#    ausgeführt, weil `git reset --hard` (Schritt 2) die getrackte Datei
#    `scripts/self-update.sh` im Repo überschreibt. Würde die laufende Kopie
#    aus dem Repo gelesen, wäre das Verhalten undefiniert.
#  * Der Projektpfad wird als $1 übergeben (vom Apply-Endpoint = process.cwd()),
#    da das Skript NICHT mehr im Repo liegt und `dirname $0` daher ins tmp-Verz.
#    zeigen würde.
#  * `pm2 restart` (Schritt 6) killt den App-Prozess, der dieses Update angestoßen
#    hat — deshalb läuft alles detached und schreibt den Fortschritt in
#    `.update/status.json`, das die wiederkehrende App per /status pollt.
#
# Nutzung (intern):
#   bash -l scripts/self-update.sh /pfad/zum/projekt <fromSha>
#
set -uo pipefail

PROJECT_DIR="${1:-}"
FROM_SHA="${2:-}"
PM2_APP="fhz-test"
BRANCH="main"
REMOTE="origin"

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR" ]; then
  echo "FEHLER: Projektverzeichnis ungültig: '$PROJECT_DIR'" >&2
  exit 1
fi

cd "$PROJECT_DIR" || exit 1

export GIT_TERMINAL_PROMPT=0

UPDATE_DIR="$PROJECT_DIR/.update"
STATUS_FILE="$UPDATE_DIR/status.json"
mkdir -p "$UPDATE_DIR"

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# JSON-String-Escape (Backslash + Anführungszeichen) für sichere status.json.
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  # Zeilenumbrüche entfernen, damit das JSON einzeilig/gültig bleibt
  s="${s//$'\n'/ }"
  s="${s//$'\r'/}"
  printf '%s' "$s"
}

# Schreibt status.json. Args: state, step, message, [toSha]
write_status() {
  local state="$1" step="$2" message="$3" to_sha="${4:-}"
  local finished_at=""
  if [ "$state" = "success" ] || [ "$state" = "error" ]; then
    finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi
  cat > "$STATUS_FILE" <<JSON
{
  "state": "$(json_escape "$state")",
  "step": "$(json_escape "$step")",
  "message": "$(json_escape "$message")",
  "startedAt": "$(json_escape "$STARTED_AT")",
  "finishedAt": "$(json_escape "$finished_at")",
  "fromSha": "$(json_escape "$FROM_SHA")",
  "toSha": "$(json_escape "$to_sha")"
}
JSON
}

CURRENT_STEP="init"

# Bei jedem Fehler (set -e-artig über trap): Status auf error + letzte Logzeile.
on_error() {
  local exit_code=$?
  local last_line
  last_line="$(tail -n 1 "$UPDATE_DIR/update.log" 2>/dev/null || echo "")"
  echo ">>> FEHLER in Schritt '$CURRENT_STEP' (Exit $exit_code)"
  write_status "error" "$CURRENT_STEP" "Fehlgeschlagen in Schritt '$CURRENT_STEP' (Exit $exit_code): $last_line"
  exit "$exit_code"
}
trap on_error ERR
set -e

echo "=================================================="
echo "Self-Update gestartet: $STARTED_AT"
echo "Projekt: $PROJECT_DIR"
echo "Von Commit: ${FROM_SHA:-unbekannt}"
echo "=================================================="

# --- Schritt 1: Start ---------------------------------------------------------
CURRENT_STEP="start"
write_status "running" "$CURRENT_STEP" "Update gestartet"

# --- Schritt 2: Code von GitHub holen ----------------------------------------
CURRENT_STEP="git"
write_status "running" "$CURRENT_STEP" "Hole neuesten Stand von $REMOTE/$BRANCH"
echo ">>> [git] fetch + reset --hard $REMOTE/$BRANCH"
git fetch "$REMOTE" --prune
git reset --hard "$REMOTE/$BRANCH"
NEW_SHA="$(git rev-parse HEAD)"
echo ">>> Neuer Commit: $NEW_SHA"

# --- Schritt 3: Dependencies installieren ------------------------------------
# WICHTIG: --include=dev erzwingen. Der Self-Update-Prozess wird vom PM2-App-
# Prozess gespawnt und erbt dessen NODE_ENV=production → sonst überspringt
# `npm install` die devDependencies. Der Build braucht aber Build-Tools, die
# als devDependencies geführt werden (z.B. @tailwindcss/postcss, tailwindcss,
# postcss, typescript) → ohne sie schlägt `next build` fehl.
CURRENT_STEP="install"
write_status "running" "$CURRENT_STEP" "Installiere Abhängigkeiten (npm install --include=dev)" "$NEW_SHA"
echo ">>> [npm] install --include=dev"
npm install --include=dev

# --- Schritt 4: Prisma -------------------------------------------------------
# `prisma generate` ist ZWINGEND: /src/generated/prisma ist gitignored und es
# gibt kein postinstall → der Client existiert nach frischem Pull nicht.
# `prisma db push` synchronisiert das Schema (Migrationen sind gitignored, daher
# kein `migrate deploy`). BEWUSST OHNE --accept-data-loss: bei destruktiven
# Schemaänderungen bricht der Schritt ab (Fail-safe), statt Daten zu verlieren.
CURRENT_STEP="prisma-generate"
write_status "running" "$CURRENT_STEP" "Generiere Prisma-Client" "$NEW_SHA"
echo ">>> [prisma] generate"
npx prisma generate

CURRENT_STEP="prisma-db-push"
write_status "running" "$CURRENT_STEP" "Synchronisiere Datenbankschema (prisma db push)" "$NEW_SHA"
echo ">>> [prisma] db push (ohne --accept-data-loss)"
npx prisma db push

# --- Schritt 5: Build in separatem Ordner + atomarer Swap --------------------
# Build schreibt nach .next.new (NEXT_DIST_DIR), während die laufende App
# ununterbrochen aus .next bedient. Erst nach erfolgreichem Build atomarer Tausch.
CURRENT_STEP="build"
write_status "running" "$CURRENT_STEP" "Baue Anwendung (.next.new)" "$NEW_SHA"
echo ">>> [build] rm -rf .next.new"
rm -rf .next.new
echo ">>> [build] NEXT_DIST_DIR=.next.new npm run build"
NEXT_DIST_DIR=.next.new npm run build

# Build erfolgreich → atomarer Swap
CURRENT_STEP="swap"
write_status "running" "$CURRENT_STEP" "Tausche neuen Build ein" "$NEW_SHA"
echo ">>> [swap] mv .next .next.old && mv .next.new .next"
rm -rf .next.old
if [ -d .next ]; then
  mv .next .next.old
fi
mv .next.new .next
rm -rf .next.old
echo ">>> [swap] erledigt"

# --- Schritt 6: Erfolg markieren (Build ist eingespielt) ---------------------
# WICHTIG: 'success' wird JETZT geschrieben — VOR dem Neustart. Grund:
# `pm2 restart` killt den kompletten Prozessbaum von fhz-test (PM2 treekill).
# Dieses Skript ist zu dem Zeitpunkt noch ein Nachfahre von fhz-test und würde
# beim Neustart mitgekillt, BEVOR es 'success' schreiben könnte → die UI hinge
# dann dauerhaft auf Schritt 'restart'. Der Build+Swap ist bereits erfolgt, also
# ist das Update inhaltlich an dieser Stelle fertig.
# Ab hier KEIN ERR-Trap/`set -e` mehr: der (entkoppelte) Neustart darf 'success'
# nicht nachträglich zu 'error' umschreiben.
set +e
trap - ERR
CURRENT_STEP="done"
write_status "success" "$CURRENT_STEP" "Update erfolgreich abgeschlossen – Anwendung wird neu gestartet" "$NEW_SHA"
echo "=================================================="
echo "Self-Update ERFOLGREICH (Build eingespielt): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Neuer Commit: $NEW_SHA"
echo "=================================================="

# --- Schritt 7: PM2-Neustart vom Skript-Prozessbaum entkoppeln ---------------
# Den Neustart in eine NEUE Session (setsid) auslagern, damit PM2s treekill den
# Neustarter nicht erwischt. `sleep 1` gibt diesem Skript Zeit, sich zu beenden,
# wodurch der Neustarter auf init umgehängt wird und kein fhz-test-Nachfahre
# mehr ist → er überlebt den Neustart und führt ihn zuverlässig aus.
echo ">>> [pm2] restart $PM2_APP --update-env (entkoppelt via setsid)"
if command -v setsid >/dev/null 2>&1; then
  setsid --fork bash -c "sleep 1; pm2 restart '$PM2_APP' --update-env >> '$UPDATE_DIR/update.log' 2>&1" < /dev/null > /dev/null 2>&1 || true
else
  # Fallback ohne setsid: direkter Neustart (Skript wird ggf. mitgekillt, aber
  # 'success' steht bereits → UI bleibt korrekt).
  pm2 restart "$PM2_APP" --update-env >> "$UPDATE_DIR/update.log" 2>&1 || true
fi
exit 0
