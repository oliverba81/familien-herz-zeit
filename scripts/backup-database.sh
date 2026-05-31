#!/bin/bash

# Backup-Script für PostgreSQL Datenbank
# Verwendung: ./scripts/backup-database.sh
# Oder: npm run backup:db

set -e  # Beende bei Fehlern

# Wechsle ins Projekt-Verzeichnis
cd "$(dirname "$0")/.."

# Lade .env Datei
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep DATABASE_URL | xargs)
fi

# Prüfe ob DATABASE_URL gesetzt ist
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Fehler: DATABASE_URL nicht gefunden in .env"
    exit 1
fi

# Bereinige DATABASE_URL - entferne Query-Parameter die pg_dump nicht unterstützt
# pg_dump unterstützt keine Parameter wie ?schema=public
CLEAN_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')

# Erstelle Backup-Verzeichnis
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Erstelle Dateiname mit Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "🔄 Erstelle Datenbank-Backup..."
echo "📁 Ziel: $BACKUP_FILE"

# Führe pg_dump aus
pg_dump "$CLEAN_DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Prüfe Dateigröße
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup erfolgreich erstellt: $BACKUP_FILE ($FILE_SIZE)"
    
    # Komprimiere Backup
    echo "📦 Komprimiere Backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Komprimiert: $BACKUP_FILE ($COMPRESSED_SIZE)"
    
    # Lösche Backups älter als 30 Tage
    echo "🧹 Lösche alte Backups (>30 Tage)..."
    DELETED=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +30 -delete -print | wc -l)
    if [ "$DELETED" -gt 0 ]; then
        echo "✅ $DELETED alte Backups gelöscht"
    else
        echo "ℹ️  Keine alten Backups zum Löschen gefunden"
    fi
    
    echo ""
    echo "✅ Datenbank-Backup abgeschlossen!"
    echo "📁 Backup-Datei: $BACKUP_FILE"
else
    echo "❌ Fehler beim Erstellen des Backups"
    exit 1
fi

