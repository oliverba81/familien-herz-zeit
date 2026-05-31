# Test-Server: 500 bei CSS/JS-Chunks

## Symptom

- `GET /_next/static/chunks/11569661b2d04a60.css` → **500 (Internal Server Error)**
- `GET /_next/static/chunks/8d84ec4cfd8f8db1.js` → **500 (Internal Server Error)**
- Seite lädt ohne Styles/ohne funktionierendes JS

## Ursache

Die **HTML-Seite** verweist auf Chunk-Dateien mit **alten Hashes** aus einem früheren Build. Diese Dateien existieren auf dem Server nicht mehr (z. B. nach neuem Deploy mit neuem Build). Jeder Build erzeugt neue Dateinamen (z. B. `2f85b13a7a5c15c7.css`). Wenn der Browser die alten URLs anfragt, antwortet der Server mit 500 (oder 404), wenn die Datei fehlt.

## Lösung

### 1. Einheitlichen Build deployen (wichtig)

- **Lokal** sauber bauen und den **kompletten** Ordner `.next/` deployen:
  ```bash
  npm run deploy:build
  ```
  (Das Skript führt `rm -rf .next` und `npm run build` aus und gibt die nächsten Schritte aus.)
- Beim Deploy **immer den gesamten** `.next/`-Ordner (inkl. `static/chunks/`) mit ausliefern. Keine Mischung aus altem HTML und neuem Chunk-Ordner (oder umgekehrt).
- Nach dem Deploy **kein** gecachtes HTML ausliefern: z. B. CDN/Proxy-Cache für `/_next/*` und die Startseite leeren oder kurz TTL setzen, bis der neue Stand läuft.

### 2. Cache leeren

- **Browser:** Hard Reload (Strg+Shift+R) oder Cache leeren.
- **Nginx/Proxy/CDN:** Cache für die Startseite und für `/_next/static/*` invalidieren bzw. kurz deaktivieren.
- Nach `npm run deploy:build` werden diese Schritte am Ende der Ausgabe angezeigt.

### 3. Nginx (falls im Einsatz)

- Statische Next-Dateien möglichst **direkt** von der Platte liefern, nicht über Node:
  ```nginx
  location /_next/static/ {
    alias /pfad/zu/deiner/app/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  ```
- So liefert Nginx bei fehlenden Dateien **404** statt dass die Anfrage an Node geht und dort ggf. 500 auslöst.
- Wenn `/_next/*` an Node durchgereicht wird: Sicherstellen, dass nach einem Deploy derselbe Build (gleicher `.next/`-Inhalt) wie die laufende Node-App verwendet wird.

### 4. Favicon 404

- `favicon.ico` 404 ist unabhängig: Favicon z. B. unter `app/favicon.ico` (oder `public/favicon.ico`) ablegen, dann liefert Next.js es automatisch.

## Kurz-Check

- Nach Deploy: HTML der Startseite im Browser „Quelltext anzeigen“ – die `<link rel="stylesheet">` und `<script src="...">` URLs müssen zu **Dateien passen, die unter `.next/static/chunks/` auf dem Server existieren**.

## Checkliste nach Deploy (wenn weiterhin 500 bei Chunks)

1. **Kompletten Build deployen**
   - Lokal: `npm run deploy:build` (erzeugt frischen `.next/`).
   - Auf dem Test-Server den **gesamten** Ordner `.next/` ersetzen (nicht nur Teile). Altes `.next/` vorher löschen oder überschreiben.

2. **Kein gemischter Stand**
   - Die laufende Node-App muss exakt den gleichen `.next/`-Inhalt verwenden, den die Nutzer bekommen. Kein alter Prozess mit altem Build, während Nginx schon aus neuem Build liefert (oder umgekehrt).

3. **Caches leeren**
   - **Browser:** Strg+Shift+R (Hard Reload) auf test.familien-herz-zeit.de/admin/pages (oder Cache leeren).
   - **Nginx:** Cache für `/_next/static/*` und für `/`, `/admin`, `/admin/pages` invalidieren (oder `proxy_cache` kurz deaktivieren).
   - **CDN:** Falls vorhanden, gleiche Pfade invalidieren.

4. **Nginx: statische Chunks direkt ausliefern (empfohlen)**
   - Wenn `/_next/static/*` an Node durchgereicht wird und eine Datei fehlt, kann Node 500 zurückgeben. Besser: Nginx liefert die Dateien direkt und gibt bei fehlender Datei 404:
   ```nginx
   location /_next/static/ {
     alias /pfad/zu/app/.next/static/;
     expires 1y;
     add_header Cache-Control "public, immutable";
   }
   ```
   - Danach Node nur noch für alle anderen Pfade (z. B. `location /`) verwenden.

5. **Prüfen auf dem Server**
   - Nach Deploy auf dem Server prüfen, ob die im Browser angeforderten Chunk-Dateien existieren, z. B.:
   ```bash
   ls -la .next/static/chunks/*.css
   ls -la .next/static/chunks/*.js
   ```
   - Die im Fehler genannte Datei (z. B. `...5b13a7a5c15c7.css`) muss in diesem Ordner vorhanden sein. Wenn nicht: HTML ist von einem älteren Build, Caches leeren (Schritt 3).
