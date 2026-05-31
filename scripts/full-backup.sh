#!/bin/bash

# Vollständiges Backup: Code + Datenbank + Konfiguration
# Verwendung: ./scripts/full-backup.sh
# Oder: npm run backup:full

set -e  # Beende bei Fehlern

# Wechsle ins Projekt-Verzeichnis
cd "$(dirname "$0")/.."

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="full_backup_$TIMESTAMP"
FULL_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"

mkdir -p "$FULL_BACKUP_DIR"

echo "🔄 Starte vollständiges Backup..."
echo "📁 Ziel-Verzeichnis: $FULL_BACKUP_DIR"
echo ""

# 1. Code-Backup (ohne node_modules, .next, etc.)
echo "📦 Erstelle Code-Backup..."
echo "   Ausgeschlossen: node_modules, .next, backups, .git, *.log, .env, tsconfig.tsbuildinfo"

# Erstelle temporäre Datei mit Liste der ausgeschlossenen Dateien für besseres Debugging
EXCLUDE_FILE=$(mktemp)
cat > "$EXCLUDE_FILE" << 'EXCLUDES'
node_modules
.next
backups
.git
*.log
.env
tsconfig.tsbuildinfo
EXCLUDES

tar --exclude-from="$EXCLUDE_FILE" \
    -czf "$FULL_BACKUP_DIR/code.tar.gz" . 2>/dev/null

TAR_EXIT=$?
rm -f "$EXCLUDE_FILE"

if [ $TAR_EXIT -eq 0 ]; then
    CODE_SIZE=$(du -h "$FULL_BACKUP_DIR/code.tar.gz" | cut -f1)
    FILE_COUNT=$(tar -tzf "$FULL_BACKUP_DIR/code.tar.gz" 2>/dev/null | wc -l)
    echo "✅ Code-Backup erstellt: code.tar.gz ($CODE_SIZE, $FILE_COUNT Dateien)"
    
    # Prüfe wichtige Dateien
    echo ""
    echo "🔍 Prüfe wichtige Dateien im Backup..."
    IMPORTANT_FILES=("package.json" "package-lock.json" "tsconfig.json" "next.config.js" "prisma/schema.prisma" "src")
    ALL_PRESENT=true
    for file in "${IMPORTANT_FILES[@]}"; do
        if tar -tzf "$FULL_BACKUP_DIR/code.tar.gz" 2>/dev/null | grep -q "^\./$file"; then
            echo "   ✓ $file"
        else
            echo "   ✗ $file (FEHLT!)"
            ALL_PRESENT=false
        fi
    done
    
    if [ "$ALL_PRESENT" = true ]; then
        echo "   ✅ Alle wichtigen Dateien vorhanden"
    else
        echo "   ⚠️  WARNUNG: Einige wichtige Dateien fehlen!"
    fi
else
    echo "❌ Fehler beim Erstellen des Code-Backups"
    exit 1
fi

# 2. Datenbank-Backup
echo ""
echo "💾 Erstelle Datenbank-Backup..."
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep DATABASE_URL | xargs)
fi

if [ ! -z "$DATABASE_URL" ]; then
    # Bereinige DATABASE_URL - entferne Query-Parameter die pg_dump nicht unterstützt
    CLEAN_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')
    pg_dump "$CLEAN_DATABASE_URL" | gzip > "$FULL_BACKUP_DIR/database.sql.gz"
    if [ $? -eq 0 ]; then
        DB_SIZE=$(du -h "$FULL_BACKUP_DIR/database.sql.gz" | cut -f1)
        echo "✅ Datenbank-Backup erstellt: database.sql.gz ($DB_SIZE)"
    else
        echo "⚠️  Fehler beim Erstellen des Datenbank-Backups"
    fi
else
    echo "⚠️  DATABASE_URL nicht gefunden, überspringe Datenbank-Backup"
fi

# 3. .env Backup (wichtig für Konfiguration, aber ohne sensible Daten)
if [ -f .env ]; then
    # Erstelle .env.example als Backup (ohne Passwörter)
    grep -v -E '^(PASSWORD|SECRET|KEY|TOKEN)=' .env > "$FULL_BACKUP_DIR/.env.example" 2>/dev/null || true
    echo "✅ .env.example erstellt (ohne sensible Daten)"
    
    # Warnung für vollständiges .env
    echo "⚠️  WICHTIG: Vollständige .env-Datei wurde aus Sicherheitsgründen NICHT gesichert!"
    echo "   Bitte sichere .env manuell an einem sicheren Ort."
fi

# 4. Prisma Schema Backup
if [ -f prisma/schema.prisma ]; then
    cp prisma/schema.prisma "$FULL_BACKUP_DIR/schema.prisma"
    echo "✅ Prisma Schema gesichert"
fi

# 5. Erstelle Info-Datei
cat > "$FULL_BACKUP_DIR/backup-info.txt" << EOF
========================================
Backup-Information
========================================
Erstellt am: $(date)
Projekt: Familien Herz Zeit
Backup-Typ: Vollständig (Code + Datenbank)

Enthaltene Dateien:
- code.tar.gz: Vollständiger Projekt-Code (ohne node_modules, .next, etc.)
- database.sql.gz: PostgreSQL Datenbank-Dump
- schema.prisma: Prisma Datenbank-Schema
- .env.example: Beispiel-Umgebungsvariablen (ohne sensible Daten)

========================================
Wiederherstellung
========================================

1. Code wiederherstellen:
   cd /pfad/zum/projekt
   tar -xzf code.tar.gz

2. Dependencies installieren:
   npm install

3. Datenbank wiederherstellen:
   gunzip -c database.sql.gz | psql \$DATABASE_URL
   
   Oder verwende das Script:
   npm run restore:db database.sql.gz

4. Umgebungsvariablen einrichten:
   - Kopiere .env.example zu .env
   - Fülle sensible Werte manuell aus

5. Prisma Client generieren:
   npx prisma generate

6. Server starten:
   npm run dev

========================================
WICHTIGE HINWEISE
========================================
- Die .env-Datei enthält sensible Daten und wurde NICHT gesichert
- Sichere .env manuell an einem sicheren Ort
- Prüfe nach der Wiederherstellung alle Konfigurationen
- Teste die Anwendung nach der Wiederherstellung gründlich
EOF

echo ""
echo "✅ Vollständiges Backup abgeschlossen!"
echo "📁 Backup-Verzeichnis: $FULL_BACKUP_DIR"
TOTAL_SIZE=$(du -sh "$FULL_BACKUP_DIR" | cut -f1)
echo "📊 Gesamtgröße: $TOTAL_SIZE"
echo ""
echo "📄 Backup-Informationen: $FULL_BACKUP_DIR/backup-info.txt"

