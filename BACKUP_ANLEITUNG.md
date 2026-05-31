# Backup-Anleitung - Familien Herz Zeit

Diese Anleitung erklärt, wie du den kompletten Code und die Datenbank sicherst und wiederherstellst.

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Schnellstart](#schnellstart)
3. [Detaillierte Anleitung](#detaillierte-anleitung)
4. [Automatische Backups](#automatische-backups)
5. [Cloud-Backup](#cloud-backup)
6. [Troubleshooting](#troubleshooting)

---

## Übersicht

Das Projekt bietet drei Backup-Methoden:

1. **Datenbank-Backup** - Nur PostgreSQL-Datenbank
2. **Vollständiges Backup** - Code + Datenbank + Konfiguration
3. **Git-Backup** - Versionskontrolle für Code

### Backup-Verzeichnis

Alle Backups werden im Verzeichnis `./backups/` gespeichert:
- Datenbank-Backups: `backups/db_backup_YYYYMMDD_HHMMSS.sql.gz`
- Vollständige Backups: `backups/full_backup_YYYYMMDD_HHMMSS/`

---

## Schnellstart

### Datenbank-Backup erstellen

```bash
# Methode 1: NPM Script
npm run backup:db

# Methode 2: Direkt
./scripts/backup-database.sh
```

### Vollständiges Backup erstellen

```bash
# Methode 1: NPM Script
npm run backup:full

# Methode 2: Direkt
./scripts/full-backup.sh
```

### Datenbank wiederherstellen

```bash
# Methode 1: NPM Script
npm run restore:db backups/db_backup_20241214_120000.sql.gz

# Methode 2: Direkt
./scripts/restore-database.sh backups/db_backup_20241214_120000.sql.gz
```

---

## Detaillierte Anleitung

### 1. Datenbank-Backup

**Was wird gesichert:**
- Komplette PostgreSQL-Datenbank
- Alle Tabellen, Daten, Indizes, Constraints

**Ausführung:**
```bash
npm run backup:db
```

**Ergebnis:**
- Datei: `backups/db_backup_YYYYMMDD_HHMMSS.sql.gz`
- Komprimiert (gzip)
- Alte Backups (>30 Tage) werden automatisch gelöscht

**Wann verwenden:**
- Regelmäßige Datenbank-Sicherungen
- Vor größeren Änderungen
- Täglich/wöchentlich automatisiert

### 2. Vollständiges Backup

**Was wird gesichert:**
- ✅ Kompletter Projekt-Code (ohne `node_modules`, `.next`, etc.)
  - Alle Source-Dateien (`src/`)
  - Alle Konfigurationsdateien (`package.json`, `tsconfig.json`, `next.config.js`, etc.)
  - Prisma Schema und Migrations (`prisma/`)
  - Public Assets (`public/uploads/`)
  - Storage Dateien (`storage/`)
  - Scripts (`scripts/`)
  - Dokumentation (`*.md`)
- ✅ PostgreSQL-Datenbank (komprimiert)
- ✅ Prisma Schema (separat als `schema.prisma`)
- ✅ `.env.example` (ohne sensible Daten)

**Was wird NICHT gesichert:**
- ❌ `node_modules/` (kann mit `npm install` wiederhergestellt werden)
- ❌ `.next/` (Build-Artefakte, werden neu gebaut)
- ❌ `.git/` (Git-Historie, sollte separat gesichert werden)
- ❌ `backups/` (um Endlosschleifen zu vermeiden)
- ❌ `.env` (sensible Daten, muss manuell gesichert werden)
- ❌ `*.log` (Log-Dateien)
- ❌ `tsconfig.tsbuildinfo` (Build-Cache)

**Ausführung:**
```bash
npm run backup:full
```

**Ergebnis:**
- Verzeichnis: `backups/full_backup_YYYYMMDD_HHMMSS/`
- Enthält: `code.tar.gz`, `database.sql.gz`, `schema.prisma`, `backup-info.txt`

**Wann verwenden:**
- Vor größeren Updates
- Vor Server-Migrationen
- Monatliche Vollständige Sicherungen

**⚠️ WICHTIG:** Die `.env`-Datei wird aus Sicherheitsgründen NICHT gesichert. Sichere sie manuell an einem sicheren Ort!

### 3. Wiederherstellung

#### Datenbank wiederherstellen

```bash
# 1. Backup-Datei finden
ls -lh backups/*.sql.gz

# 2. Wiederherstellen
npm run restore:db backups/db_backup_20241214_120000.sql.gz

# 3. Prisma Client neu generieren
npx prisma generate

# 4. Server neu starten
npm run dev
```

#### Vollständiges Backup wiederherstellen

```bash
# 1. Code extrahieren
cd /pfad/zum/neuen/projekt
tar -xzf backups/full_backup_YYYYMMDD_HHMMSS/code.tar.gz

# 2. Dependencies installieren
npm install

# 3. Datenbank wiederherstellen
gunzip -c backups/full_backup_YYYYMMDD_HHMMSS/database.sql.gz | psql $DATABASE_URL

# 4. .env einrichten
cp .env.example .env
# Bearbeite .env und füge sensible Werte hinzu

# 5. Prisma Client generieren
npx prisma generate

# 6. Server starten
npm run dev
```

---

## Automatische Backups

### Cron-Job einrichten (Linux/macOS)

Für tägliche automatische Backups:

```bash
# Crontab öffnen
crontab -e

# Füge diese Zeile hinzu (täglich um 2 Uhr morgens):
0 2 * * * cd /root/srv/cursor-projects/familien-herz-zeit && npm run backup:db >> /var/log/familien-herz-zeit-backup.log 2>&1

# Oder wöchentlich vollständiges Backup (Sonntag um 3 Uhr):
0 3 * * 0 cd /root/srv/cursor-projects/familien-herz-zeit && npm run backup:full >> /var/log/familien-herz-zeit-backup-full.log 2>&1
```

### Systemd Timer (Linux)

Erstelle `/etc/systemd/system/familien-herz-zeit-backup.service`:

```ini
[Unit]
Description=Familien Herz Zeit Database Backup
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/root/srv/cursor-projects/familien-herz-zeit
ExecStart=/usr/bin/npm run backup:db
```

Erstelle `/etc/systemd/system/familien-herz-zeit-backup.timer`:

```ini
[Unit]
Description=Daily Backup Timer for Familien Herz Zeit

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Aktiviere den Timer:
```bash
sudo systemctl enable familien-herz-zeit-backup.timer
sudo systemctl start familien-herz-zeit-backup.timer
```

---

## Cloud-Backup

### AWS S3

```bash
# Installiere AWS CLI
# https://aws.amazon.com/cli/

# Konfiguriere AWS
aws configure

# Backup zu S3 hochladen
aws s3 sync ./backups s3://dein-backup-bucket/familien-herz-zeit/backups/

# Automatisiert nach Backup
# Füge am Ende von backup-database.sh hinzu:
aws s3 cp "$BACKUP_FILE" s3://dein-backup-bucket/familien-herz-zeit/db/
```

### rsync zu Remote-Server

```bash
# Backup zu Remote-Server kopieren
rsync -avz --delete ./backups/ user@remote-server:/backups/familien-herz-zeit/

# Mit SSH-Key (empfohlen)
rsync -avz -e "ssh -i /path/to/key" ./backups/ user@remote-server:/backups/familien-herz-zeit/
```

### Google Drive / Dropbox

```bash
# Installiere rclone
# https://rclone.org/

# Konfiguriere rclone
rclone config

# Backup hochladen
rclone copy ./backups remote:familien-herz-zeit/backups/
```

---

## Troubleshooting

### Problem: "pg_dump: command not found"

**Lösung:**
```bash
# PostgreSQL Client Tools installieren
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# macOS:
brew install postgresql

# Oder verwende Docker:
docker run --rm -v $(pwd)/backups:/backups postgres:15 pg_dump $DATABASE_URL > /backups/db_backup.sql
```

### Problem: "DATABASE_URL nicht gefunden"

**Lösung:**
- Prüfe ob `.env`-Datei existiert
- Prüfe ob `DATABASE_URL` in `.env` gesetzt ist
- Format: `postgresql://user:password@host:port/database`

### Problem: "Permission denied" beim Wiederherstellen

**Lösung:**
```bash
# Prüfe Datenbank-Berechtigungen
psql $DATABASE_URL -c "SELECT current_user;"

# Prüfe ob User DROP/CREATE Rechte hat
# Falls nicht, verwende Superuser:
DATABASE_URL="postgresql://postgres:password@host:port/database" npm run restore:db ...
```

### Problem: Backup-Datei ist zu groß

**Lösung:**
```bash
# Verwende Kompression (bereits aktiv)
# Prüfe ob gzip funktioniert

# Oder verwende custom format:
pg_dump -Fc $DATABASE_URL > backup.dump
pg_restore -d $DATABASE_URL backup.dump
```

### Problem: Wiederherstellung schlägt fehl

**Lösung:**
1. Prüfe Datenbank-Verbindung: `psql $DATABASE_URL -c "SELECT 1;"`
2. Prüfe Backup-Datei: `gunzip -t backup.sql.gz`
3. Prüfe Logs für spezifische Fehler
4. Stelle sicher, dass Datenbank leer ist oder verwende `--clean` Flag

---

## Best Practices

### Backup-Strategie

1. **Tägliche Datenbank-Backups** - Automatisiert via Cron
2. **Wöchentliche Vollständige Backups** - Manuell oder automatisiert
3. **Vor größeren Änderungen** - Immer manuelles Backup
4. **Cloud-Backup** - Mindestens wöchentlich

### Backup-Aufbewahrung

- **Tägliche Backups:** 7 Tage
- **Wöchentliche Backups:** 4 Wochen
- **Monatliche Backups:** 12 Monate
- **Vollständige Backups:** Unbegrenzt (wichtig für Migrationen)

### Sicherheit

- ✅ `.env`-Datei NICHT in Backups
- ✅ Backups verschlüsselt speichern (optional)
- ✅ Backups an mehreren Orten (lokal + Cloud)
- ✅ Regelmäßig Wiederherstellung testen
- ✅ Zugriff auf Backups beschränken

### Test-Wiederherstellung

**Wichtig:** Teste regelmäßig die Wiederherstellung!

```bash
# 1. Erstelle Test-Datenbank
createdb test_restore

# 2. Stelle Backup in Test-Datenbank wieder her
gunzip -c backups/db_backup_*.sql.gz | psql test_restore

# 3. Prüfe Daten
psql test_restore -c "SELECT COUNT(*) FROM \"Page\";"

# 4. Lösche Test-Datenbank
dropdb test_restore
```

---

## NPM Scripts Übersicht

| Script | Beschreibung |
|--------|--------------|
| `npm run backup:db` | Erstellt Datenbank-Backup |
| `npm run backup:full` | Erstellt vollständiges Backup (Code + DB) |
| `npm run restore:db <file>` | Stellt Datenbank aus Backup wieder her |

---

## Support

Bei Problemen oder Fragen:
1. Prüfe die Logs: `tail -f /var/log/familien-herz-zeit-backup.log`
2. Prüfe Backup-Dateien: `ls -lh backups/`
3. Teste Datenbank-Verbindung: `psql $DATABASE_URL -c "SELECT 1;"`

---

**Letzte Aktualisierung:** 2024-12-14

