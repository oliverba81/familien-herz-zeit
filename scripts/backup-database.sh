#!/bin/bash

# Backup-Script für PostgreSQL Datenbank mit Fortschrittsanzeige
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
CLEAN_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')

# Erstelle Backup-Verzeichnis
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Erstelle Dateiname mit Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo "═══════════════════════════════════════════════════════════"
echo "🔄 Erstelle Datenbank-Backup..."
echo "📁 Ziel: $BACKUP_FILE"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Funktion für Fortschrittsanzeige
show_progress() {
    local pid=$1
    local message=$2
    local spinner="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 10 ))
        printf "\r${message} ${spinner:$i:1} "
        sleep 0.1
    done
    printf "\r${message} ✅\n"
}

# Starte pg_dump im Hintergrund mit verbose Ausgabe
echo "📊 Starte Datenbank-Dump..."
pg_dump --verbose "$CLEAN_DATABASE_URL" > "$BACKUP_FILE" 2>&1 &
DUMP_PID=$!

# Zeige Fortschritt während des Dumps
show_progress $DUMP_PID "🔄 Dump läuft"

# Warte auf Abschluss
wait $DUMP_PID
DUMP_EXIT_CODE=$?

if [ $DUMP_EXIT_CODE -eq 0 ]; then
    # Prüfe Dateigröße
    FILE_SIZE=$(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo "0")
    echo "✅ Backup erfolgreich erstellt: $BACKUP_FILE ($FILE_SIZE)"
    echo ""
    
    # Komprimiere Backup mit Fortschrittsanzeige
    echo "📦 Komprimiere Backup..."
    gzip "$BACKUP_FILE" &
    GZIP_PID=$!
    show_progress $GZIP_PID "🔄 Komprimierung läuft"
    wait $GZIP_PID
    
    if [ -f "$BACKUP_FILE_GZ" ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_FILE_GZ" 2>/dev/null | cut -f1 || echo "0")
        echo "✅ Komprimiert: $BACKUP_FILE_GZ ($COMPRESSED_SIZE)"
        echo ""
        
        # Lösche Backups älter als 30 Tage
        echo "🧹 Lösche alte Backups (>30 Tage)..."
        DELETED=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +30 -delete -print 2>/dev/null | wc -l)
        if [ "$DELETED" -gt 0 ]; then
            echo "✅ $DELETED alte Backups gelöscht"
        else
            echo "ℹ️  Keine alten Backups zum Löschen gefunden"
        fi
        
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "✅ Datenbank-Backup abgeschlossen!"
        echo "📁 Backup-Datei: $BACKUP_FILE_GZ"
        echo "📊 Größe: $COMPRESSED_SIZE"
        echo "═══════════════════════════════════════════════════════════"
    else
        echo "❌ Fehler: Komprimierte Datei nicht gefunden"
        exit 1
    fi
else
    echo "❌ Fehler beim Erstellen des Backups (Exit Code: $DUMP_EXIT_CODE)"
    exit 1
fi