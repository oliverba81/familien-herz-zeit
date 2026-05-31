# E-Mail Setup (SMTP)

Dieses Projekt verwendet `nodemailer` für den E-Mail-Versand über SMTP.

## Erforderliche Umgebungsvariablen

Fügen Sie folgende Variablen zu Ihrer `.env` Datei hinzu:

```env
# SMTP Konfiguration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_SECURE=false  # true für Port 465 (SSL), false für Port 587 (STARTTLS)

# E-Mail Absender
MAIL_FROM="Familien Herz Zeit <noreply@example.com>"

# Admin E-Mail (für Kontaktanfragen und Benachrichtigungen)
MAIL_ADMIN_TO=kontakt@example.com

# Basis-URL der Anwendung (für absolute Links in E-Mails)
APP_BASE_URL=http://localhost:3000  # In Production: https://yourdomain.com
```

## Beispiel-Konfigurationen

### Gmail (für Development)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # App-Passwort erforderlich, nicht das normale Passwort
SMTP_SECURE=false
MAIL_FROM="Familien Herz Zeit <your-email@gmail.com>"
MAIL_ADMIN_TO=your-email@gmail.com
APP_BASE_URL=http://localhost:3000
```

**Hinweis für Gmail:** Sie müssen ein [App-Passwort](https://support.google.com/accounts/answer/185833) erstellen, da normale Passwörter nicht funktionieren.

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
MAIL_FROM="Familien Herz Zeit <noreply@yourdomain.com>"
MAIL_ADMIN_TO=kontakt@yourdomain.com
APP_BASE_URL=https://yourdomain.com
```

### Mailtrap (für Testing)

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_SECURE=false
MAIL_FROM="Familien Herz Zeit <test@mailtrap.io>"
MAIL_ADMIN_TO=test@mailtrap.io
APP_BASE_URL=http://localhost:3000
```

## E-Mail-Flows

### 1. Kontaktformular (`POST /api/contact`)
- Sendet E-Mail an Admin (`MAIL_ADMIN_TO`) mit Kontaktanfrage
- Sendet Bestätigungs-E-Mail an Absender (optional)

### 2. Buchung (`POST /api/bookings`)
- Sendet Bestätigungs-E-Mail an Teilnehmer (PENDING Status)
- Sendet Benachrichtigung an Admin (optional)

### 3. Video Access Request (`POST /api/video-access/request`)
- Sendet E-Mail mit Access-Link an angegebene E-Mail-Adresse

## Test-Route

In Development-Modus können Sie die E-Mail-Funktionalität testen:

```
GET /api/dev/test-email
```

**Voraussetzungen:**
- `NODE_ENV=development`
- Authentifiziert als ADMIN

Die Test-E-Mail wird an `MAIL_ADMIN_TO` gesendet.

## Fehlerbehandlung

- Wenn E-Mail-Versand fehlschlägt, wird die Operation trotzdem als erfolgreich markiert (z.B. Buchung wird gespeichert)
- `mailSent: false` wird in der Response zurückgegeben
- Fehler werden in der Konsole geloggt

## Templates

E-Mail-Templates befinden sich in `src/lib/email/templates/`:
- `layout.ts` - Basis-Layout für alle E-Mails
- `contact.ts` - Kontaktformular-E-Mails
- `booking.ts` - Buchungs-E-Mails
- `videoAccess.ts` - Video-Zugang-E-Mails

