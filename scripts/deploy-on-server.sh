#!/usr/bin/env bash
# Deploy auf dem Server: sauberer Build + PM2-Neustart.
# Nutzung: Im Projektordner ausführen:
#   bash scripts/deploy-on-server.sh
# oder von überall:
#   bash /root/srv/cursor-projects/familien-herz-zeit/scripts/deploy-on-server.sh
set -e
cd "$(dirname "$0")/.."
echo "=== Deploy auf Server ==="
echo "1. Alten Build entfernen..."
rm -rf .next
echo "2. Neu bauen..."
npm run build
echo "3. PM2-App neu starten..."
pm2 restart fhz-test
echo ""
echo "=== Deploy fertig ==="
echo "  • Test-URL: https://test.familien-herz-zeit.de"
echo "  • Im Browser: Strg+Shift+R (Hard Reload), falls Seiten ohne Styles laden."
echo "  • Bei Nginx: ggf. Cache für /_next/static/* invalidieren."
echo ""
