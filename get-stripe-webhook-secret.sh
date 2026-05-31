#!/bin/bash

echo "=========================================="
echo "Stripe Webhook Secret Setup"
echo "=========================================="
echo ""

# Prüfe ob Stripe CLI installiert ist
if command -v stripe &> /dev/null; then
    echo "✓ Stripe CLI ist bereits installiert"
    STRIPE_INSTALLED=true
else
    echo "✗ Stripe CLI ist nicht installiert"
    STRIPE_INSTALLED=false
fi

echo ""
echo "Option 1: Lokales Testen mit Stripe CLI (empfohlen)"
echo "---------------------------------------------------"
if [ "$STRIPE_INSTALLED" = false ]; then
    echo ""
    echo "1. Installiere Stripe CLI:"
    echo "   Für Linux x86_64:"
    echo "   cd /tmp"
    echo "   wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz"
    echo "   tar -xzf stripe_linux_x86_64.tar.gz"
    echo "   sudo mv stripe /usr/local/bin/"
    echo ""
    echo "   Oder mit Homebrew (wenn verfügbar):"
    echo "   brew install stripe/stripe-cli/stripe"
    echo ""
    echo "2. Logge dich bei Stripe ein:"
    echo "   stripe login"
    echo ""
    echo "3. Starte Webhook-Forwarding:"
    echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
    echo ""
    echo "4. Kopiere das Webhook Secret (beginnt mit 'whsec_...')"
    echo "   und füge es in deine .env-Datei ein:"
    echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
else
    echo ""
    echo "1. Logge dich bei Stripe ein (falls noch nicht geschehen):"
    echo "   stripe login"
    echo ""
    echo "2. Starte Webhook-Forwarding:"
    echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
    echo ""
    echo "3. Kopiere das Webhook Secret (beginnt mit 'whsec_...')"
    echo "   und füge es in deine .env-Datei ein:"
    echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
fi

echo ""
echo ""
echo "Option 2: Production (Stripe Dashboard)"
echo "---------------------------------------------------"
echo ""
echo "1. Gehe zu: https://dashboard.stripe.com/webhooks"
echo ""
echo "2. Klicke auf 'Add endpoint'"
echo ""
echo "3. Endpoint URL eingeben:"
echo "   https://deine-domain.de/api/stripe/webhook"
echo ""
echo "4. Events auswählen:"
echo "   - checkout.session.completed"
echo ""
echo "5. Nach dem Erstellen:"
echo "   - Klicke auf den Webhook-Endpunkt"
echo "   - Klicke auf 'Reveal' beim 'Signing secret'"
echo "   - Kopiere das Secret (beginnt mit 'whsec_...')"
echo "   - Füge es in deine .env-Datei ein:"
echo "     STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""

echo ""
echo "=========================================="
echo "Aktueller Status:"
echo "=========================================="
if [ -f .env ]; then
    if grep -q "STRIPE_WEBHOOK_SECRET=" .env; then
        SECRET_VALUE=$(grep "STRIPE_WEBHOOK_SECRET=" .env | cut -d'=' -f2)
        if [ -z "$SECRET_VALUE" ] || [ "$SECRET_VALUE" = '""' ] || [ "$SECRET_VALUE" = "''" ]; then
            echo "⚠ STRIPE_WEBHOOK_SECRET ist in .env vorhanden, aber leer"
        else
            echo "✓ STRIPE_WEBHOOK_SECRET ist in .env gesetzt"
            echo "  Wert: ${SECRET_VALUE:0:20}..." # Erste 20 Zeichen anzeigen
        fi
    else
        echo "✗ STRIPE_WEBHOOK_SECRET fehlt in .env"
    fi
else
    echo "⚠ .env-Datei nicht gefunden"
fi

echo ""

