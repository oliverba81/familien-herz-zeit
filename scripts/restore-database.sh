#!/bin/bash

# Datenbank-Wiederherstellung
# Verwendung: ./scripts/restore-database.sh <backup-file.sql.gz>
# Oder: npm run restore:db <backup-file.sql.gz>

set -e  # Beende bei Fehlern

# Wechsle ins Projekt-Verzeichnis
cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
    echo "❌ Fehler: Keine Backup-Datei angegeben"
    echo ""
    echo "Verwendung:"
    echo "  ./scripts/restore-database.sh <backup-file.sql.gz>"
    echo "  npm run restore:db <backup-file.sql.gz>"
    echo ""
    echo "Beispiel:"
    echo "  ./scripts/restore-database.sh backups/db_backup_20241214_120000.sql.gz"
    echo ""
    echo "Verfügbare Backups:"
    if [ -d "./backups" ]; then
        ls -lh ./backups/*.sql.gz 2>/dev/null | tail -5 || echo "  Keine Backups gefunden"
    else
        echo "  Kein backups-Verzeichnis gefunden"
    fi
    exit 1
fi

BACKUP_FILE=$1

# Prüfe ob Datei existiert
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fehler: Backup-Datei nicht gefunden: $BACKUP_FILE"
    exit 1
fi

# Lade .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Fehler: DATABASE_URL nicht gefunden in .env"
    exit 1
fi

# Zeige Backup-Informationen
echo "📄 Backup-Datei: $BACKUP_FILE"
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📊 Größe: $FILE_SIZE"
echo "🔗 Datenbank: $DATABASE_URL"
echo ""

# Warnung
echo "⚠️  WARNUNG: Dies wird die aktuelle Datenbank überschreiben!"
echo "   Alle aktuellen Daten werden gelöscht und durch das Backup ersetzt."
echo ""
read -p "Möchtest du wirklich fortfahren? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
    echo "❌ Abgebrochen"
    exit 0
fi

echo ""
echo "🔄 Stelle Datenbank wieder her..."

# Bereinige DATABASE_URL - entferne Query-Parameter die psql nicht unterstützt
CLEAN_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')

# Prüfe ob Datei komprimiert ist
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql "$CLEAN_DATABASE_URL"
else
    psql "$CLEAN_DATABASE_URL" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Datenbank erfolgreich wiederhergestellt!"
    echo ""
    echo "📝 Nächste Schritte:"
    echo "   1. Prisma Client neu generieren: npx prisma generate"
    echo "   2. Server neu starten: npm run dev"
    echo "   3. Datenbank-Inhalt prüfen"
else
    echo ""
    echo "❌ Fehler bei der Wiederherstellung"
    echo "   Bitte prüfe die Fehlermeldungen oben"
    exit 1
fi

