# App weiterentwickeln – Workspace auf Hetzner

Kurzanleitung für die Weiterentwicklung der Familien-Herz-Zeit-App, wenn der Workspace auf dem Hetzner-Server liegt (oder du per Remote SSH verbunden bist).

---

## 1. Wo entwickeln?

### Option A: Direkt auf dem Server (Cursor Remote SSH)

- **Host:** `root@49.12.10.11`
- **Projektordner:** `/root/srv/cursor-projects/familien-herz-zeit`
- Du bearbeitest die Dateien direkt auf Hetzner, die DB ist schon vor Ort.

### Option B: Lokal (z.B. Windows) mit DB-Tunnel

- Code lokal klonen/kopieren.
- **Vor** `npm run dev`: SSH-Tunnel zur DB starten (siehe `DATENBANK_VERBINDUNG.md`):
  ```bash
  ssh -i .\familienherzzeit -N -L 5432:localhost:5432 root@49.12.10.11
  ```
- Dann im Projektordner: `npm install` und `npm run dev`.

Admin-Zugangsdaten:
Email: admin@familienherzzeit.local
Passwort: Admin123!

---

## 2. Täglicher Entwicklungsablauf auf dem Server

### Dev-Server mit Hot Reload (für Cursor)

Im Projektordner:

```bash
cd /root/srv/cursor-projects/familien-herz-zeit
npm run dev -- -p 3001
```

- **Port 3001** = dein Dev-Server (Hot Reload).
- **Port 3000** = Test-Live-App (`pm2 fhz-test`) – **nicht stoppen**.

### Dev im Browser ansehen (nur für dich)

Auf deinem PC (PowerShell):

```bash
ssh -i C:\Users\Buero-Oliver\.ssh\familienherzzeit -L 3001:127.0.0.1:3001 root@49.12.10.11
```

Dann im Browser: **http://localhost:3001**

---

## 3. Änderungen auf Test (test.familien-herz-zeit.de) bringen

**Empfohlen (sauberer Deploy, behebt auch 500 bei CSS/JS-Chunks):**

```bash
cd /root/srv/cursor-projects/familien-herz-zeit
npm run deploy
```

Das Skript macht: `.next` löschen → `npm run build` → `pm2 restart fhz-test`.

**Alternativ manuell:**

```bash
cd /root/srv/cursor-projects/familien-herz-zeit
npm run build
pm2 restart fhz-test
```

Prüfen: **https://test.familien-herz-zeit.de**. Bei fehlenden Styles: im Browser **Strg+Shift+R** (Hard Reload).

### Wichtig: .env auf dem Server für Test-URL

Damit Logout und Login auf **test.familien-herz-zeit.de** funktionieren (und nicht auf localhost landen), müssen auf dem **Hetzner-Server** in der `.env` im Projektordner stehen:

```env
NEXTAUTH_URL="https://test.familien-herz-zeit.de"
APP_BASE_URL="https://test.familien-herz-zeit.de"
```

(Lokal kannst du weiterhin `NEXTAUTH_URL="http://localhost:3000"` und `APP_BASE_URL=""` oder localhost nutzen.)

### Wenn „Failed to load chunk“, 500 bei CSS/JS oder Admin ohne Styles

Wenn im Browser Fehler wie „Failed to load chunk“ oder 500 bei `_next/static/chunks/...` auftreten (Seite lädt ohne Styles):

1. **Sauberer Deploy auf dem Server:**
   ```bash
   cd /root/srv/cursor-projects/familien-herz-zeit
   npm run deploy
   ```
   (Entspricht: `rm -rf .next` → `npm run build` → `pm2 restart fhz-test`.)
2. **Im Browser:** Strg+Shift+R (Hard Reload) oder Cache leeren.
3. **Falls Nginx vor der App hängt:** Cache für `/_next/static/*` invalidieren (oder kurz deaktivieren).

### Wenn Media-Upload 413 (Request Entity Too Large) meldet

Next.js ist in `next.config.js` bereits mit höherem Body-Limit (50 MB) konfiguriert. Tritt 413 trotzdem auf (z. B. hinter Nginx), im **Nginx**-VHost für die Test-Domain erhöhen:

```nginx
client_max_body_size 50M;
```

(Danach Nginx neu laden: `sudo systemctl reload nginx`.)

---

## 4. Datenbank-Migrationen (Schema-Änderungen)

Wenn du am Prisma-Schema etwas geändert hast:

```bash
npx prisma generate
npx prisma migrate deploy
```

(Vorher evtl. Backup: `npm run backup:db` – siehe `BACKUP_ANLEITUNG.md`.)

---

## 5. Nützliche Befehle

| Aufgabe              | Befehl                          |
|----------------------|----------------------------------|
| Dev starten (Hot Reload) | `npm run dev -- -p 3001`     |
| Build + Test deployen    | `npm run build && pm2 restart fhz-test` |
| DB-Backup               | `npm run backup:db`           |
| Lint                    | `npm run lint`                |

---

## 6. Optional: Git für saubere Weiterentwicklung

Aktuell ist **kein Git-Repository** im Projekt. Für Versionskontrolle und sauberes Deploy:

```bash
cd /root/srv/cursor-projects/familien-herz-zeit
git init
git add .
git commit -m "Initial commit"
```

Remote (z.B. GitHub/GitLab) anlegen und mit `git remote add origin <url>` verbinden. Dann: Feature-Branches, Commits vor jedem Deploy, einfacheres Zurückrollen.

---

## 7. Optional: Dev-Server mit PM2 (dauerhaft auf 3001)

Damit du `npm run dev` nicht jedes Mal von Hand starten musst:

```bash
pm2 start npm --name "fhz-dev" -- run dev -- -p 3001
pm2 save
```

Danach läuft der Dev-Server bis zum Neustart des Servers. Mit `pm2 restart fhz-dev` neu starten nach z.B. `git pull` oder großen Änderungen.

---

**Zusammenfassung:** Entwickle mit `npm run dev -- -p 3001`, sieh dir das Ergebnis per SSH-Tunnel unter `http://localhost:3001` an, und bringe Änderungen mit `npm run build` + `pm2 restart fhz-test` auf die Test-Seite.
