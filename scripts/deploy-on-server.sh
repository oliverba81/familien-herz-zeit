#!/usr/bin/env bash
# Deploy auf dem Server: sauberer Build + PM2-Neustart.
# Nutzung: Im Projektordner ausführen:
#   bash scripts/deploy-on-server.sh
# oder von überall:
#   bash /root/srv/cursor-projects/familien-herz-zeit/scripts/deploy-on-server.sh
set -e
cd "$(dirname "$0")/.."
export GIT_TERMINAL_PROMPT=0
echo "=== Deploy auf Server ==="
echo "0. Neuesten Code + Tags von GitHub holen..."
git fetch origin --tags --prune --force
echo "   -> Setze Server exakt auf origin/main (verwirft lokale Aenderungen an versionierten Dateien)..."
git reset --hard origin/main
echo "1. Abhaengigkeiten installieren (inkl. devDependencies fuer den Build)..."
# --include=dev erzwingen: Falls NODE_ENV=production gesetzt ist, wuerde npm
# sonst devDependencies (z.B. @tailwindcss/postcss, tailwindcss) ueberspringen,
# die der Build aber braucht.
npm install --include=dev
echo "2. Prisma-Client generieren + Schema synchronisieren..."
npx prisma generate
npx prisma db push
echo "3. Alten Build entfernen..."
rm -rf .next
echo "4. Neu bauen..."
npm run build
echo "5. PM2-App neu starten..."
pm2 restart fhz-test --update-env
echo ""
echo "=== Deploy fertig ==="
echo "  • Test-URL: https://test.familien-herz-zeit.de"
echo "  • Im Browser: Strg+Shift+R (Hard Reload), falls Seiten ohne Styles laden."
echo "  • Bei Nginx: ggf. Cache für /_next/static/* invalidieren."
echo ""
