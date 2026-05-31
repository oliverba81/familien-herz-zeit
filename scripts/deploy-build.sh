#!/usr/bin/env bash
# Punkt 1 + 2: Einheitlicher Build + Hinweise zum Cache leeren (siehe docs/DEPLOY-TEST-SERVER.md)
set -e
cd "$(dirname "$0")/.."
echo "=== Punkt 1: Sauberer Build ==="
rm -rf .next
npm run build
BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || true)
echo ""
echo "--- Build abgeschlossen (BUILD_ID: ${BUILD_ID:-?}) ---"
echo ""
echo "Punkt 1 – Deploy: Den kompletten Ordner .next/ auf den Server deployen (inkl. static/chunks/). Kein Mischbetrieb mit altem Build."
echo ""
echo "Punkt 2 – Cache leeren nach Deploy:"
echo "  • Browser: Hard Reload (Strg+Shift+R) oder Cache leeren"
echo "  • Nginx/Proxy/CDN: Cache für Startseite und /_next/static/* invalidieren (oder kurz deaktivieren)"
echo ""
