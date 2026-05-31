#!/bin/bash

echo "=========================================="
echo "Stripe Webhook Secret abrufen"
echo "=========================================="
echo ""

# Prüfe ob eingeloggt
if ! stripe config --list &>/dev/null; then
    echo "⚠ Du bist noch nicht bei Stripe eingeloggt."
    echo ""
    echo "Bitte führe zuerst aus:"
    echo "  stripe login"
    echo ""
    echo "Dann starte dieses Skript erneut."
    exit 1
fi

echo "✓ Stripe CLI ist eingeloggt"
echo ""
echo "Starte Webhook-Listener..."
echo "Das Webhook Secret wird in den nächsten Sekunden angezeigt."
echo "Drücke Ctrl+C, um den Listener zu beenden, nachdem du das Secret kopiert hast."
echo ""
echo "=========================================="
echo ""

# Starte stripe listen und filtere das Secret
stripe listen --forward-to localhost:3000/api/stripe/webhook 2>&1 | while IFS= read -r line; do
    echo "$line"
    
    # Suche nach dem Webhook Secret
    if echo "$line" | grep -q "whsec_"; then
        SECRET=$(echo "$line" | grep -o "whsec_[a-zA-Z0-9_]*" | head -1)
        if [ -n "$SECRET" ]; then
            echo ""
            echo "=========================================="
            echo "✓ Webhook Secret gefunden:"
            echo "=========================================="
            echo "$SECRET"
            echo ""
            echo "Füge dies in deine .env-Datei ein:"
            echo "STRIPE_WEBHOOK_SECRET=$SECRET"
            echo ""
            echo "=========================================="
        fi
    fi
done

