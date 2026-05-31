# Familien Herz Zeit - Setup Dokumentation

Diese Dokumentation beschreibt Schritt für Schritt den kompletten Aufbau des Projekts "Familien Herz Zeit".

## Projekt-Übersicht

**Technologie-Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma 7 (PostgreSQL)
- NextAuth v4 (Credentials Provider)
- React Hook Form + Zod

**Ziel:** Stabiles Fundament für eine Familienwebsite mit Admin-Bereich und Authentifizierung.

---

## Schritt 1: Projekt-Initialisierung

### 1.1 Next.js Projekt Setup

Da der Ordnername Großbuchstaben enthielt, wurde das Projekt manuell initialisiert:

**Erstellte Konfigurationsdateien:**
- `package.json` - Projekt-Konfiguration mit Dependencies
- `tsconfig.json` - TypeScript Konfiguration
- `next.config.js` - Next.js Konfiguration
- `tailwind.config.ts` - Tailwind CSS Konfiguration
- `postcss.config.js` - PostCSS Konfiguration
- `.eslintrc.json` - ESLint Konfiguration
- `.gitignore` - Git Ignore (inkl. .env)

### 1.2 Dependencies Installation

**Production Dependencies:**
```bash
npm i next-auth bcryptjs react-hook-form @hookform/resolvers zod clsx tailwind-merge lucide-react @prisma/client
```

**Development Dependencies:**
```bash
npm i -D prisma ts-node @types/node @types/bcryptjs next react react-dom
```

**Später hinzugefügt (für Prisma 7):**
```bash
npm i @prisma/adapter-pg pg
npm i -D @types/pg @tailwindcss/postcss
```

---

## Schritt 2: Prisma Setup

### 2.1 Prisma Initialisierung

```bash
npx prisma init
```

Dies erstellt:
- `prisma/schema.prisma` - Datenbank-Schema
- `prisma.config.ts` - Prisma Konfiguration

### 2.2 Schema Definition

**Prisma Schema (`prisma/schema.prisma`):**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  ADMIN
  EDITOR
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         UserRole @default(ADMIN)
  createdAt    DateTime @default(now())
}

model Page {
  id         String   @id @default(cuid())
  slug       String   @unique
  title      String
  contentJson Json
  published  Boolean  @default(false)
  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())
}
```

**Prisma Config (`prisma.config.ts`):**
- DATABASE_URL wird aus `.env` gelesen
- Seed-Kommando konfiguriert: `ts-node prisma/seed.ts`

### 2.3 Prisma Client Singleton

**Erstellt: `src/lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool =
  globalForPrisma.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**Wichtig:** Prisma 7 benötigt einen Adapter für direkte Datenbankverbindungen (`@prisma/adapter-pg`).

### 2.4 Datenbank Setup

**Datenbank zurücksetzen und Schema anwenden:**
```bash
npx prisma db push --force-reset --accept-data-loss
```

**Prisma Client generieren:**
```bash
npx prisma generate
```

---

## Schritt 3: Seed Script (Admin-User)

### 3.1 Seed Script erstellen

**Erstellt: `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@familienherzzeit.local" },
    update: {},
    create: {
      email: "admin@familienherzzeit.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin user created/updated:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3.2 Seed ausführen

```bash
npx prisma db seed
```

**Admin-Zugangsdaten:**
- Email: `admin@familienherzzeit.local`
- Passwort: `Admin123!`

---

## Schritt 4: NextAuth Setup

### 4.1 Modulare Auth-Struktur

**Erstellt: `src/lib/auth/`**

#### 4.1.1 Authorize Funktion
**`src/lib/auth/authorize.ts`**
- Prüft Email und Passwort
- Verwendet bcrypt für Passwort-Vergleich
- Gibt User-Daten zurück oder null

#### 4.1.2 Credentials Provider
**`src/lib/auth/providers.ts`**
- Konfiguriert NextAuth Credentials Provider
- Verwendet die authorize Funktion

#### 4.1.3 Callbacks
**`src/lib/auth/callbacks.ts`**
- `jwtCallback`: Fügt id und role zum JWT Token hinzu
- `sessionCallback`: Fügt id und role zur Session hinzu

#### 4.1.4 Hauptkonfiguration
**`src/lib/auth/config.ts`**
- Kombiniert Provider, Callbacks und Konfiguration
- Exportiert `authOptions`

#### 4.1.5 Re-Export
**`src/lib/auth.ts`**
- Einfacher Import: `import { authOptions } from "@/lib/auth"`

### 4.2 NextAuth Route Handler

**Erstellt: `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### 4.3 TypeScript Typen

**Erstellt: `src/types/next-auth.d.ts`**

Erweitert NextAuth Typen für:
- `session.user.id`
- `session.user.role`
- `token.id`
- `token.role`

### 4.4 Session Provider

**Erstellt: `src/app/providers.tsx`**

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Integriert in: `src/app/layout.tsx`**

---

## Schritt 5: Validierungen

### 5.1 Login Schema

**Erstellt: `src/lib/validations/auth.ts`**

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

## Schritt 6: UI-Komponenten (Modular)

### 6.1 Auth-Komponenten

**`src/components/auth/`**

- **`login-form.tsx`** - Haupt-Login-Formular (Client Component)
  - React Hook Form Integration
  - Zod Validierung
  - NextAuth signIn
  - Fehlerbehandlung

- **`login-header.tsx`** - Login-Header Komponente

- **`error-message.tsx`** - Fehlermeldung Komponente

### 6.2 Admin-Komponenten

**`src/components/admin/`**

- **`admin-container.tsx`** - Container für Admin-Layout
- **`admin-header.tsx`** - Header mit Logout-Button
- **`user-info.tsx`** - User-Info Card
- **`admin-dashboard.tsx`** - Dashboard Content

### 6.3 Home-Komponenten

**`src/components/home/`**

- **`hero.tsx`** - Hero Section für Landing Page

### 6.4 Weitere Komponenten

- **`src/components/logout-button.tsx`** - Logout Button (Client Component)

---

## Schritt 7: Pages (Next.js App Router)

### 7.1 Landing Page

**`src/app/page.tsx`**
- Einfacher Wrapper für Hero-Komponente

### 7.2 Login Page

**`src/app/admin/login/page.tsx`**
- Client Component
- Wrapper für LoginForm
- URL-Parameter für Fehler

### 7.3 Admin Protected Page

**`src/app/admin/page.tsx`**
- Server Component
- Session-Check mit `getServerSession`
- Redirect zu `/admin/login` wenn nicht eingeloggt
- Zeigt User-Info und Dashboard

### 7.4 Layout

**`src/app/layout.tsx`**
- Root Layout
- Integriert Providers (SessionProvider)
- Metadata

---

## Schritt 8: Utilities

### 8.1 CN Utility

**Erstellt: `src/lib/utils/cn.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Kombiniert clsx und tailwind-merge für besseres Tailwind CSS Class-Management.

---

## Schritt 9: Tailwind CSS 4 Konfiguration

### 9.1 PostCSS Konfiguration

**`postcss.config.js`** (angepasst für Tailwind CSS 4):

```javascript
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
```

**Wichtig:** Tailwind CSS 4 benötigt `@tailwindcss/postcss` statt `tailwindcss` direkt.

### 9.2 Globals CSS

**`src/app/globals.css`** (angepasst für Tailwind CSS 4):

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

/* ... weitere Styles ... */
```

**Wichtig:** Tailwind CSS 4 verwendet `@import "tailwindcss"` statt `@tailwind` Direktiven.

---

## Schritt 10: Projekt-Struktur (Final)

```
Familien-Herz-Zeit_v1/
├── prisma/
│   ├── schema.prisma          # Datenbank-Schema
│   ├── seed.ts                # Seed Script für Admin-User
│   └── migrations/             # (wird bei Migrationen erstellt)
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.tsx    # Login Page
│   │   │   └── page.tsx        # Admin Protected Page
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts # NextAuth API Route
│   │   ├── globals.css         # Globale Styles
│   │   ├── layout.tsx           # Root Layout
│   │   ├── page.tsx             # Landing Page
│   │   └── providers.tsx       # SessionProvider Wrapper
│   ├── components/
│   │   ├── admin/               # Admin-Komponenten
│   │   ├── auth/                # Auth-Komponenten
│   │   ├── home/                # Home-Komponenten
│   │   └── logout-button.tsx
│   ├── lib/
│   │   ├── auth/                # NextAuth Module (modular)
│   │   │   ├── authorize.ts
│   │   │   ├── callbacks.ts
│   │   │   ├── config.ts
│   │   │   └── providers.ts
│   │   ├── auth.ts              # Re-Export
│   │   ├── db.ts                # Prisma Client Singleton
│   │   ├── utils/
│   │   │   └── cn.ts            # Class Name Utility
│   │   └── validations/
│   │       └── auth.ts          # Zod Schemas
│   └── types/
│       └── next-auth.d.ts       # NextAuth TypeScript Typen
├── .env                         # Umgebungsvariablen (nicht im Git)
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── prisma.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Schritt 11: Start-Reihenfolge

### 11.1 Voraussetzungen

1. **SSH-Tunnel aktiv** (falls Remote-Datenbank)
   - Datenbank muss auf `localhost:5432` erreichbar sein
   - `.env` enthält `DATABASE_URL`

2. **Umgebungsvariablen in `.env`:**
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

### 11.2 Setup-Befehle (in Reihenfolge)

```bash
# 1. Dependencies installieren
npm install

# 2. Datenbank Schema anwenden
npx prisma db push

# 3. Prisma Client generieren
npx prisma generate

# 4. Admin-User erstellen
npx prisma db seed

# 5. Development Server starten
npm run dev
```

### 11.3 Test-Flow

1. **Landing Page:** `http://localhost:3000`
2. **Admin Login:** `http://localhost:3000/admin/login`
   - Email: `admin@familienherzzeit.local`
   - Passwort: `Admin123!`
3. **Admin Bereich:** `http://localhost:3000/admin`
   - Automatische Weiterleitung nach Login
   - Geschützt (Redirect zu Login wenn nicht eingeloggt)

---

## Schritt 12: Wichtige Anpassungen für Prisma 7

### 12.1 Prisma Client mit Adapter

Prisma 7 benötigt einen Adapter für direkte Datenbankverbindungen:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### 12.2 Prisma Config

Die `DATABASE_URL` wird in `prisma.config.ts` konfiguriert, nicht mehr im Schema:

```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

---

## Schritt 13: Modulare Architektur - Vorteile

### 13.1 Struktur-Vorteile

1. **Wiederverwendbarkeit:** Komponenten können einfach wiederverwendet werden
2. **Testbarkeit:** Kleine, fokussierte Module sind einfacher zu testen
3. **Wartbarkeit:** Klare Trennung der Verantwortlichkeiten
4. **Skalierbarkeit:** Einfach erweiterbar ohne große Dateien
5. **Lesbarkeit:** Jede Datei hat eine klare Aufgabe

### 13.2 Dateigrößen (vorher → nachher)

- `src/lib/auth.ts`: 67 Zeilen → aufgeteilt in 4 Module (je ~15-25 Zeilen)
- `src/app/admin/login/page.tsx`: 138 Zeilen → 15 Zeilen (Rest in Komponenten)
- `src/app/admin/page.tsx`: 63 Zeilen → 20 Zeilen (Rest in Komponenten)
- `src/app/page.tsx`: 27 Zeilen → 5 Zeilen (Rest in Komponente)

---

## Schritt 14: Troubleshooting

### 14.1 Häufige Probleme

**Problem:** "The table `public.seiten` does not exist"
- **Lösung:** Im richtigen Verzeichnis arbeiten (`Familien-Herz-Zeit_v1`)

**Problem:** "PrismaClient needs to be constructed with adapter"
- **Lösung:** `@prisma/adapter-pg` installieren und in `db.ts` verwenden

**Problem:** Tailwind CSS PostCSS Fehler
- **Lösung:** `@tailwindcss/postcss` installieren und in `postcss.config.js` verwenden

**Problem:** Seed schlägt fehl
- **Lösung:** `dotenv` in seed.ts importieren, Adapter verwenden

---

## Zusammenfassung

Das Projekt wurde vollständig modular aufgebaut mit:

✅ Next.js 14+ App Router  
✅ TypeScript (strict mode)  
✅ Tailwind CSS 4  
✅ Prisma 7 mit PostgreSQL  
✅ NextAuth v4 (Credentials)  
✅ Modulare Komponenten-Struktur  
✅ Geschützte Admin-Routen  
✅ Seed Script für Admin-User  
✅ **Pages CRUD System (Stunde 2)**
  - Auth-geschützte API-Routen
  - Admin-UI für Seitenverwaltung
  - Öffentliche dynamische Slug-Seiten
  - Content Renderer (hero, text, spacer)
  - Automatische Slug-Generierung
  - Vollständige Validierung
✅ **Page Builder Light (Stunde 3)**
  - Visueller Block-Editor
  - 8 Block-Typen (Hero, Text, Image, Video, Features, Testimonials, CTA, Spacer)
  - Block-Operationen (Add, Remove, Move Up/Down, Duplicate)
  - Live Preview
  - Advanced JSON Editor
  - Format-Migration (altes → neues Format)
  - dnd-kit-ready Struktur

**Alle Dateien sind erstellt, konfiguriert und getestet.**

---

## Schritt 15: Pages CRUD (Stunde 2)

### 15.1 Übersicht

Implementierung eines vollständigen CRUD-Systems für Seiten (Pages) mit:
- Auth-geschützten API-Routen
- Admin-UI für Seitenverwaltung
- Öffentliche dynamische Slug-Seiten
- Content Renderer für JSON-basierte Inhalte

### 15.2 Auth Guard Helper

**Erstellt: `src/lib/auth/require-role.ts`**

```typescript
export async function requireRole(
  roles: UserRole[],
  options?: RequireRoleOptions
): Promise<Session | null>
```

**Funktionen:**
- `requireRole(roles, options)` - Prüft ob User eingeloggt ist und erlaubte Rolle hat
- `requireAdmin(options)` - Kurzform für nur ADMIN

**Verwendung:**
- In Server Components: `await requireRole(["ADMIN", "EDITOR"])`
- In API Routes: `await requireRole(["ADMIN", "EDITOR"], { throwError: true })`

### 15.3 Validation Schemas

**Erstellt: `src/lib/validations/pages.ts`**

```typescript
export const pageUpsertSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  published: z.boolean(),
  contentJson: z.any(),
});
```

**Validierungsregeln:**
- Titel: Mindestens 1 Zeichen
- Slug: Nur Kleinbuchstaben, Zahlen und Bindestriche
- Published: Boolean
- ContentJson: Beliebiger JSON-Wert

### 15.4 Utilities

**Erstellt: `src/lib/utils/slugify.ts`**

```typescript
export function slugify(text: string): string
```

**Funktionalität:**
- Konvertiert Text zu URL-freundlichem Slug
- Umlaute ersetzen (ä→ae, ö→oe, ü→ue, ß→ss)
- Whitespace/Underscore zu Bindestrich
- Nicht-alphanumerische Zeichen entfernen
- Mehrfache Bindestriche zusammenfassen
- Führende/abschließende Bindestriche entfernen

### 15.5 API Routes

#### 15.5.1 GET/POST /api/pages

**Erstellt: `src/app/api/pages/route.ts`**

**GET /api/pages:**
- Auth required (ADMIN oder EDITOR)
- Gibt Liste aller Seiten zurück
- Sortiert nach `updatedAt desc`
- Felder: id, slug, title, published, updatedAt, createdAt

**POST /api/pages:**
- Auth required (ADMIN oder EDITOR)
- Validiert Body mit Zod Schema
- Generiert Slug automatisch aus Titel, falls leer
- Prüft Slug-Eindeutigkeit (409 bei Konflikt)
- Parst contentJson (String → JSON)
- Erstellt neue Seite

#### 15.5.2 GET/PUT/DELETE /api/pages/[id]

**Erstellt: `src/app/api/pages/[id]/route.ts`**

**GET /api/pages/:id:**
- Auth required
- Gibt einzelne Seite zurück
- 404 wenn nicht gefunden

**PUT /api/pages/:id:**
- Auth required
- Validiert Body
- Prüft Slug-Eindeutigkeit (ausgenommen aktuelle ID)
- Parst contentJson
- Aktualisiert Seite

**DELETE /api/pages/:id:**
- Auth required
- Prüft ob Seite existiert
- Löscht Seite

**Fehlerbehandlung:**
- 400: Validierungsfehler
- 401: Unauthorized
- 403: Forbidden
- 404: Nicht gefunden
- 409: Slug-Konflikt
- 500: Server-Fehler

### 15.6 Admin UI - Pages Management

#### 15.6.1 Navigation erweitert

**Angepasst: `src/components/admin/admin-dashboard.tsx`**

- Link zu "Seiten verwalten" hinzugefügt
- Führt zu `/admin/pages`

#### 15.6.2 Seiten-Liste

**Erstellt: `src/app/admin/pages/page.tsx`**

**Features:**
- Server Component mit `requireRole` Guard
- Lädt Seiten direkt mit Prisma (Server-side)
- Tabelle mit: Titel, Slug, Status (Badge), Aktualisiert, Aktionen
- Button "Neue Seite"
- Link zu Bearbeiten für jede Seite
- Leere Zustand mit Call-to-Action

**Styling:**
- Tailwind CSS Tabelle
- Hover-Effekte
- Responsive Design

#### 15.6.3 Neue Seite erstellen

**Erstellt: `src/app/admin/pages/new/page.tsx`**

- Server Component Wrapper
- Nutzt `PageForm` Komponente
- Mode: "create"

**Erstellt: `src/components/pages/page-form.tsx`**

**Features:**
- React Hook Form + Zod Validierung
- Felder:
  - Titel (required)
  - Slug (optional, auto-generiert aus Titel)
  - Veröffentlicht (Checkbox)
  - Content JSON (Textarea mit Default-Template)
- Auto-Slug-Generierung (kann deaktiviert werden)
- JSON-Parsing mit Fehlerbehandlung
- Submit: POST /api/pages
- Erfolg: Redirect zu `/admin/pages`

**Default Content JSON:**
```json
{
  "blocks": [
    { "type": "hero", "heading": "Überschrift", "subheading": "Untertitel" },
    { "type": "text", "text": "Dein Text…" },
    { "type": "spacer", "size": "md" }
  ]
}
```

#### 15.6.4 Seite bearbeiten

**Erstellt: `src/app/admin/pages/[id]/page.tsx`**

- Server Component lädt initial Page
- Gibt Daten an Client Component weiter
- Zeigt "Öffnen" Link wenn published
- Zeigt "Nicht veröffentlicht" wenn nicht published

**Erstellt: `src/app/admin/pages/[id]/page-form-client.tsx`**

- Client Component für Edit-Formular
- Nutzt `PageForm` mit Mode "edit"
- Delete-Funktionalität mit Bestätigung
- Submit: PUT /api/pages/[id]
- Delete: DELETE /api/pages/[id]

#### 15.6.5 UI Komponenten

**Erstellt: `src/components/ui/badge.tsx`**

- Wiederverwendbare Badge-Komponente
- Varianten: default, success, warning, error
- Verwendet für Published-Status

### 15.7 Öffentliche Slug-Seite

**Erstellt: `src/app/[slug]/page.tsx`**

**Features:**
- Server Component
- Dynamischer Route Parameter `[slug]`
- Lädt Page mit Prisma:
  - `where: { slug, published: true }`
- `notFound()` wenn nicht gefunden oder nicht published
- `generateMetadata()` für SEO
- Rendert Titel und Content

**Erstellt: `src/components/pages/content-renderer.tsx`**

**Content Renderer für JSON Blocks:**

**Unterstützte Block-Typen:**

1. **hero:**
   ```json
   {
     "type": "hero",
     "heading": "Überschrift",
     "subheading": "Untertitel"
   }
   ```
   - Große Hero-Section mit Gradient-Hintergrund
   - Zentrierter Text

2. **text:**
   ```json
   {
     "type": "text",
     "text": "Mehrzeiliger Text..."
   }
   ```
   - Paragraph mit whitespace-pre-line
   - Unterstützt mehrzeiligen Text

3. **spacer:**
   ```json
   {
     "type": "spacer",
     "size": "md"
   }
   ```
   - Größen: sm, md, lg, xl
   - Fügt vertikalen Abstand hinzu

**Fallback:**
- Wenn kein contentJson oder keine blocks → "Inhalt noch nicht definiert"
- Unbekannte Block-Typen werden ignoriert

### 15.8 Projekt-Struktur (nach Stunde 2)

```
src/
├── app/
│   ├── [slug]/
│   │   └── page.tsx              # Öffentliche Slug-Seite
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx              # Edit Page
│   │   │   │   └── page-form-client.tsx  # Client Form Wrapper
│   │   │   ├── new/
│   │   │   │   └── page.tsx              # Create Page
│   │   │   └── page.tsx                  # Pages Liste
│   │   └── ...
│   └── api/
│       └── pages/
│           ├── [id]/
│           │   └── route.ts      # GET/PUT/DELETE
│           └── route.ts           # GET/POST
├── components/
│   ├── pages/
│   │   ├── content-renderer.tsx   # Content JSON Renderer
│   │   └── page-form.tsx          # Wiederverwendbares Formular
│   └── ui/
│       └── badge.tsx              # Badge Komponente
└── lib/
    ├── auth/
    │   └── require-role.ts        # Auth Guard Helper
    ├── utils/
    │   └── slugify.ts             # Slug-Generierung
    └── validations/
        └── pages.ts                # Page Validation Schema
```

### 15.9 Test-Flow

**1. Admin Login:**
```
URL: http://localhost:3000/admin/login
Email: admin@familienherzzeit.local
Passwort: Admin123!
```

**2. Seiten-Liste öffnen:**
```
URL: http://localhost:3000/admin/pages
→ Sollte leere Liste oder vorhandene Seiten zeigen
```

**3. Neue Seite erstellen:**
```
1. Klick auf "Neue Seite"
2. Titel eingeben: "Willkommen"
3. Slug wird automatisch generiert: "willkommen"
4. "Veröffentlicht" aktivieren
5. Content JSON (Standard-Template ist bereits eingefügt)
6. "Speichern" klicken
```

**4. Öffentliche Seite prüfen:**
```
URL: http://localhost:3000/willkommen
→ Sollte die Seite mit Content Renderer zeigen
```

**5. Seite bearbeiten:**
```
1. Zurück zu /admin/pages
2. "Bearbeiten" klicken
3. Änderungen vornehmen
4. "Speichern"
```

**6. Seite löschen:**
```
1. In der Edit-Ansicht
2. "Seite löschen" klicken
3. Bestätigung
```

### 15.10 Content JSON Format

**Vollständiges Beispiel:**
```json
{
  "blocks": [
    {
      "type": "hero",
      "heading": "Willkommen bei Familien Herz Zeit",
      "subheading": "Ihre Familienwebsite"
    },
    {
      "type": "text",
      "text": "Hier können Sie Ihre schönsten Momente teilen.\n\nMehrzeiliger Text wird unterstützt."
    },
    {
      "type": "spacer",
      "size": "md"
    },
    {
      "type": "text",
      "text": "Weiterer Text nach dem Abstand."
    }
  ]
}
```

**Block-Typen Übersicht:**

| Typ | Felder | Beschreibung |
|-----|--------|--------------|
| `hero` | `heading`, `subheading` | Große Hero-Section |
| `text` | `text` | Paragraph (mehrzeilig) |
| `spacer` | `size` (sm/md/lg/xl) | Vertikaler Abstand |

### 15.11 Wichtige Implementierungsdetails

**Slug-Generierung:**
- Automatisch aus Titel wenn leer
- Kann manuell überschrieben werden
- Validierung: Nur `[a-z0-9-]`
- Eindeutigkeitsprüfung bei Create/Update

**Auth-Schutz:**
- Alle API-Routen: `requireRole(["ADMIN", "EDITOR"])`
- Admin-Seiten: `requireRole(["ADMIN", "EDITOR"])` mit Redirect
- Öffentliche Slug-Seiten: Kein Auth, nur `published: true` Check

**Fehlerbehandlung:**
- API: Strukturierte HTTP-Status-Codes
- UI: Inline-Fehlermeldungen
- JSON-Parsing: Try/Catch mit klaren Meldungen

**Performance:**
- Server Components für Daten-Loading
- Client Components nur für Interaktivität
- Direkte Prisma-Queries (kein API-Call in Server Components)

### 15.12 Nächste Schritte (Stunde 3)

**Geplant: Page Builder "Light"**
- Block-UI (Add/Remove/Reorder)
- Block-Settings Sidebar
- Live Preview
- Alles basierend auf `contentJson.blocks` Format

---

## Schritt 16: Page Builder Light (Stunde 3)

### 16.1 Übersicht

Implementierung eines visuellen Page Builders mit Live Preview für die Bearbeitung von `Page.contentJson` als Block-Liste. Kein Drag & Drop, aber vollständige Block-Operationen und dnd-kit-ready Struktur.

**Features:**
- 8 Block-Typen (Hero, Text, Image, Video, Features, Testimonials, CTA, Spacer)
- Block-Operationen (Add, Remove, Move Up/Down, Duplicate)
- Live Preview während Bearbeitung
- Advanced JSON Editor (Import/Export)
- Format-Migration (altes Format wird automatisch konvertiert)

### 16.2 Content-Format Standardisierung

#### 16.2.1 Types

**Erstellt: `src/lib/page-builder/types.ts`**

```typescript
export type BlockType = "hero" | "text" | "image" | "video" | "features" | "testimonials" | "cta" | "spacer";

export interface Block {
  id: string;  // Stabile ID für dnd-kit
  type: BlockType;
  data: Record<string, any>;
}

export interface PageContent {
  version: number;  // Für zukünftige Migrationen
  blocks: Block[];
}
```

**Wichtig:** Jeder Block hat eine stabile `id`, damit später dnd-kit Reorder stabil funktioniert.

#### 16.2.2 Templates & Normalisierung

**Erstellt: `src/lib/page-builder/templates.ts`**

**Funktionen:**
- `generateBlockId()`: Generiert eindeutige IDs (crypto.randomUUID oder Fallback)
- `createBlock(type)`: Erstellt neuen Block mit Default-Daten
- `createDefaultContent()`: Erstellt Default PageContent
- `normalizeContent(content)`: Migriert altes Format zu neuem Format

**Default-Daten pro Block-Typ:**

| Block-Typ | Default-Daten |
|-----------|---------------|
| `hero` | `{ heading, subheading, align: "center" }` |
| `text` | `{ text }` |
| `image` | `{ src, alt, caption }` |
| `video` | `{ src, title }` |
| `features` | `{ items: [{ title, text }] }` |
| `testimonials` | `{ items: [{ name, text }] }` |
| `cta` | `{ heading, text, buttonLabel, buttonHref }` |
| `spacer` | `{ size: "md" }` |

**Migration:**
- Unterstützt altes Format: `{ blocks: [...] }` ohne version
- Generiert IDs für Blocks ohne ID
- Setzt version auf 1

#### 16.2.3 Validation

**Erstellt: `src/lib/page-builder/validate.ts`**

```typescript
export const pageContentSchema = z.object({
  version: z.number().int().positive(),
  blocks: z.array(blockSchema),
});

export function validatePageContent(content: any): ValidationResult
```

**Validierung:**
- Prüft Struktur (version, blocks)
- Prüft Block-Struktur (id, type, data)
- Gibt strukturierte Fehlermeldungen zurück

### 16.3 Zentraler Page Renderer

**Erstellt: `src/components/page-renderer/page-renderer.tsx`**

**Funktionalität:**
- Rendert `PageContent` mit allen Block-Typen
- Server-safe (kann auch Client verwendet werden)
- Fallback für unbekannte/fehlende Blocks

**Block-Renderer:**

1. **Hero Block:**
   - Gradient-Hintergrund
   - Heading & Subheading
   - Ausrichtung (left/center/right)

2. **Text Block:**
   - Mehrzeiliger Text
   - Whitespace-pre-line Support

3. **Image Block:**
   - `<img>` Tag
   - Alt-Text & Caption
   - Fallback wenn kein src

4. **Video Block:**
   - `<video controls>` Tag
   - Titel optional
   - Fallback wenn kein src

5. **Features Block:**
   - Grid-Layout (responsive)
   - Liste von Feature-Items
   - Cards mit Titel & Text

6. **Testimonials Block:**
   - Liste von Testimonials
   - Styling mit Border & Hintergrund
   - Name & Text

7. **CTA Block:**
   - Gradient-Hintergrund
   - Heading, Text, Button
   - Link-Integration

8. **Spacer Block:**
   - Vertikaler Abstand
   - Größen: sm, md, lg, xl

### 16.4 Public Slug Page Anpassung

**Angepasst: `src/app/[slug]/page.tsx`**

**Änderungen:**
- Nutzt jetzt `PageRenderer` statt `ContentRenderer`
- Ruft `normalizeContent()` auf für Format-Migration
- Unterstützt altes und neues Format
- Keine DB-Migration nötig (on-the-fly)

**Migration-Logik:**
```typescript
const normalizedContent = normalizeContent(page.contentJson);
// → Konvertiert altes Format zu neuem Format
// → Generiert IDs falls fehlend
// → Setzt version auf 1
```

### 16.5 Page Builder Komponenten

#### 16.5.1 Hauptkomponente: Builder

**Erstellt: `src/components/page-builder/builder.tsx`**

**Layout:**
- 2-Spalten (Links: Management, Rechts: Preview)
- Tab Switcher: "Builder" / "Advanced JSON"
- State Management für `selectedBlockId`

**Features:**
- Block-Operationen (Add, Remove, Move, Duplicate)
- Live Preview (nutzt `PageRenderer`)
- State-Synchronisation (selectedBlockId bleibt erhalten)
- JSON Error Handling

**State-Synchronisation:**
- `useEffect` reagiert nur auf Block-Löschungen
- `selectedBlockId` bleibt beim Verschieben erhalten
- Neuer Block wird automatisch ausgewählt

#### 16.5.2 Block-Liste

**Erstellt: `src/components/page-builder/block-list.tsx`**

**Features:**
- Liste aller Blocks mit Icons & Labels
- Visual Selection (Highlight)
- Actions pro Block:
  - ↑ Nach oben
  - ↓ Nach unten
  - 📋 Duplizieren
  - 🗑️ Löschen
- Click zum Auswählen

**Block-Labels:**
- Hero: Zeigt `heading`
- Text: Zeigt ersten 30 Zeichen
- Andere: Block-Typ Name

#### 16.5.3 Block-Editor

**Erstellt: `src/components/page-builder/block-editor.tsx`**

**Funktionalität:**
- Zeigt Settings für ausgewählten Block
- Block-spezifische Formulare:
  - **Hero:** heading, subheading, align (select)
  - **Text:** textarea
  - **Image:** src (url), alt, caption
  - **Video:** src (url), title
  - **Features:** Liste-Editor (Add/Remove Items)
  - **Testimonials:** Liste-Editor (Add/Remove Items)
  - **CTA:** heading, text, buttonLabel, buttonHref
  - **Spacer:** size (select: sm/md/lg/xl)

**Liste-Editoren:**
- Features & Testimonials haben dynamische Item-Listen
- Add/Remove Buttons pro Item
- Inline-Editierung

#### 16.5.4 Add Block Menu

**Erstellt: `src/components/page-builder/add-block-menu.tsx`**

**Features:**
- Grid-Layout mit 8 Block-Typen
- Icons & Labels
- Click fügt Block hinzu
- Neuer Block wird automatisch ausgewählt

#### 16.5.5 Advanced JSON Editor

**Erstellt: `src/components/page-builder/advanced-json.tsx`**

**Features:**
- Textarea für JSON-Editierung
- Import-Button (validiert & setzt Builder-State)
- Export-Button (zeigt aktuellen JSON)
- Fehlerbehandlung bei ungültigem JSON
- Warnung vor Datenverlust

### 16.6 Integration in Page Form

**Angepasst: `src/components/pages/page-form.tsx`**

**Änderungen:**
- `builderContent` State hinzugefügt
- Initialisierung: `normalizeContent()` wenn vorhanden, sonst `createDefaultContent()`
- Textarea durch `Builder` Komponente ersetzt
- Submit nutzt `builderContent` statt Textarea-Content

**Vorher:**
```typescript
// Textarea für JSON
<textarea {...register("contentJson")} />
```

**Nachher:**
```typescript
// Builder Komponente
<Builder value={builderContent} onChange={setBuilderContent} />
```

### 16.7 Projekt-Struktur (nach Stunde 3)

```
src/
├── lib/
│   └── page-builder/
│       ├── types.ts              # TypeScript Typen
│       ├── templates.ts          # Default Templates & Migration
│       └── validate.ts           # Zod Validation
├── components/
│   ├── page-builder/
│   │   ├── builder.tsx            # Hauptkomponente
│   │   ├── block-list.tsx        # Block-Liste
│   │   ├── block-editor.tsx      # Block-Editor
│   │   ├── add-block-menu.tsx    # Add Menu
│   │   └── advanced-json.tsx      # JSON Editor
│   └── page-renderer/
│       └── page-renderer.tsx     # Zentraler Renderer
└── app/
    └── [slug]/
        └── page.tsx               # Angepasst für neues Format
```

### 16.8 Block-Operationen Details

#### 16.8.1 Add Block

**Flow:**
1. User klickt auf Block-Typ im Add Menu
2. `createBlock(type)` erstellt neuen Block mit Default-Daten
3. Block wird zu `blocks` Array hinzugefügt
4. `selectedBlockId` wird auf neuen Block gesetzt
5. Editor öffnet sich automatisch

#### 16.8.2 Move Block

**Flow:**
1. User klickt ↑ oder ↓ Button
2. Blocks werden im Array getauscht
3. `selectedBlockId` bleibt erhalten (gleiche ID)
4. Editor bleibt geöffnet

**Implementierung:**
```typescript
const newBlocks = [...value.blocks];
[newBlocks[fromIndex], newBlocks[toIndex]] = [
  newBlocks[toIndex],
  newBlocks[fromIndex],
];
```

#### 16.8.3 Duplicate Block

**Flow:**
1. User klickt 📋 Button
2. Block wird kopiert mit neuer ID
3. Kopie wird nach Original eingefügt
4. Kopie wird automatisch ausgewählt

#### 16.8.4 Delete Block

**Flow:**
1. User klickt 🗑️ Button
2. Bestätigungsdialog
3. Block wird aus Array entfernt
4. Falls gelöschter Block ausgewählt war → erster verfügbarer Block wird ausgewählt

### 16.9 Live Preview

**Implementierung:**
- Nutzt `PageRenderer` Komponente
- Rendert `value` (aktueller Builder-State)
- Sticky Position (rechts, bleibt sichtbar beim Scrollen)
- Echtzeit-Updates bei jeder Änderung

**Vorteile:**
- Sofortiges visuelles Feedback
- Kein Speichern nötig für Preview
- Identisches Rendering wie öffentliche Seite

### 16.10 Format-Migration

**Altes Format (Stunde 2):**
```json
{
  "blocks": [
    { "type": "hero", "heading": "..." },
    { "type": "text", "text": "..." }
  ]
}
```

**Neues Format (Stunde 3):**
```json
{
  "version": 1,
  "blocks": [
    {
      "id": "uuid-here",
      "type": "hero",
      "data": {
        "heading": "...",
        "subheading": "...",
        "align": "center"
      }
    }
  ]
}
```

**Migration:**
- Automatisch beim Laden (Public Page & Admin)
- IDs werden generiert falls fehlend
- `data` wird aus Block-Eigenschaften extrahiert
- `version` wird auf 1 gesetzt

### 16.11 State-Synchronisation (Bug-Fix)

**Problem:**
- Bearbeitungsmodus wurde beim Hinzufügen/Verschieben verlassen
- `selectedBlockId` wurde zurückgesetzt

**Lösung:**
- `useEffect` reagiert nur auf Block-Löschungen (Längenänderung)
- `selectedBlockId` wird explizit beibehalten beim Verschieben
- Neuer Block wird sofort als `selectedBlockId` gesetzt

**Code:**
```typescript
// Nur auf Löschungen reagieren
const prevBlocksLengthRef = useRef(value.blocks.length);
useEffect(() => {
  const currentLength = value.blocks.length;
  const prevLength = prevBlocksLengthRef.current;
  
  if (currentLength < prevLength && selectedBlockId) {
    // Block wurde gelöscht
    const blockExists = value.blocks.some((b) => b.id === selectedBlockId);
    if (!blockExists) {
      setSelectedBlockId(value.blocks[0]?.id || null);
    }
  }
  
  prevBlocksLengthRef.current = currentLength;
}, [value.blocks.length]);
```

### 16.12 Test-Flow

**1. Neue Seite mit Builder erstellen:**
```
/admin/pages/new
→ Titel eingeben
→ Builder öffnet sich automatisch
→ Default Blocks (Hero, Text) sind bereits vorhanden
```

**2. Blocks hinzufügen:**
```
- Klick auf "Block hinzufügen"
- Wähle z.B. "Features"
- Block erscheint in Liste
- Editor öffnet sich automatisch
- Bearbeitungsmodus bleibt aktiv
```

**3. Blocks bearbeiten:**
```
- Block in Liste anklicken
- Editor zeigt Settings
- Änderungen werden live in Preview angezeigt
- Bearbeitungsmodus bleibt aktiv
```

**4. Blocks reorganisieren:**
```
- ↑/↓ Buttons zum Verschieben
- Block bleibt ausgewählt
- Editor bleibt geöffnet
- Preview aktualisiert sich
```

**5. Blocks duplizieren:**
```
- 📋 Button klicken
- Kopie wird erstellt
- Kopie wird automatisch ausgewählt
- Editor öffnet sich
```

**6. Speichern & prüfen:**
```
- "Speichern" klicken
- Zurück zu /admin/pages
- Öffentliche Seite öffnen: /{slug}
→ Sollte identisch zur Preview sein
```

**7. Edit & Reorder:**
```
- Seite bearbeiten öffnen
- Blocks mit Up/Down neu ordnen
- Bearbeitungsmodus bleibt aktiv
- Erneut speichern
- Öffentliche Seite prüfen
```

### 16.13 Advanced JSON Mode

**Verwendung:**
- Tab "Advanced JSON" öffnen
- JSON direkt bearbeiten
- "Import" klicken (validiert & setzt Builder-State)
- "Export" zeigt aktuellen JSON

**Warnung:**
- Ungültiges JSON kann zu Datenverlust führen
- Immer "Export" verwenden um aktuellen Stand zu sehen

### 16.14 dnd-kit Ready Struktur

**Vorbereitung für Stunde 4+ (Drag & Drop):**

**Aktuell:**
- Blocks haben stabile IDs
- Array-basierte Struktur
- Move Up/Down Buttons

**Für dnd-kit:**
- IDs sind bereits vorhanden
- Struktur ist kompatibel
- Nur Buttons durch Drag & Drop ersetzen
- `onChange` Callback bleibt gleich

**Beispiel-Integration (zukünftig):**
```typescript
import { DndContext, DragEndEvent } from "@dnd-kit/core";

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={value.blocks.map(b => b.id)}>
    {/* Block-Liste */}
  </SortableContext>
</DndContext>
```

### 16.15 Wichtige Implementierungsdetails

**State Management:**
- `builderContent` in Page Form (getrennt von Form-State)
- `selectedBlockId` in Builder (lokaler State)
- `onChange` Callback für Parent-Update

**Performance:**
- `useCallback` für alle Handler
- `useRef` für vorherige Block-Länge
- Minimale Re-Renders

**Fehlerbehandlung:**
- JSON-Validierung beim Import
- Fallbacks für fehlende Daten
- User-freundliche Fehlermeldungen

**UX:**
- Live Preview für sofortiges Feedback
- Automatische Block-Auswahl beim Hinzufügen
- Bearbeitungsmodus bleibt stabil
- Visual Feedback (Selection Highlight)

---

## Schritt 17: SEO & Performance Hardening (Stunde 17)

### 17.1 Übersicht

Implementierung einer soliden SEO/Performance-Basis für die Next.js App Router Webapp mit:
- robots.txt und dynamischer sitemap.xml
- OpenGraph/Twitter Meta Tags
- Canonical URLs
- Caching/Revalidation Strategy
- 404 & Error Pages

### 17.2 ENV Konfiguration

**Erforderliche Umgebungsvariable:**
```env
APP_BASE_URL=http://localhost:3000  # In Production: https://yourdomain.com
```

Die `APP_BASE_URL` wird für:
- Absolute URLs in Sitemap
- Canonical URLs
- OpenGraph Images
- Robots.txt Sitemap-URL

verwendet.

### 17.3 SEO Helper Functions

**Erstellt: `src/lib/seo/meta.ts`**

**Funktionen:**
- `getBaseUrl()`: Gibt die Base URL zurück (APP_BASE_URL, VERCEL_URL oder Fallback)
- `absoluteUrl(path)`: Erstellt absolute URL aus relativem Pfad
- `buildOpenGraph(data)`: Erstellt OpenGraph Metadata Objekt
- `extractTextFromContent(contentJson, maxLength)`: Extrahiert Text aus Content-JSON für Description

**Erstellt: `src/lib/seo/tags.ts`**

**Cache Tag Funktionen:**
- `tagPage(slug)`: `page:${slug}`
- `tagPages()`: `pages`
- `tagCourses()`: `courses`
- `tagCourse(id)`: `course:${id}`
- `tagVideoCourses()`: `video-courses`
- `tagVideoCourse(id)`: `videoCourse:${id}`

### 17.4 robots.txt

**Erstellt: `src/app/robots.ts`**

**Konfiguration:**
- User-Agent: `*`
- Disallow: `/admin`, `/api`
- Allow: `/`
- Sitemap: `${APP_BASE_URL}/sitemap.xml`

**URL:** `http://localhost:3000/robots.txt`

### 17.5 Dynamische Sitemap

**Erstellt: `src/app/sitemap.ts`**

**Enthaltene URLs:**
- `/` (Home, priority: 1.0)
- Alle published Pages: `/${slug}` (priority: 0.8)
- `/kurse`, `/kurse/kalender` (priority: 0.9)
- Alle published Courses: `/kurse/[id]` (priority: 0.7)
- `/videokurse` (priority: 0.9)
- Alle published VideoCourses: `/videokurse/[slug]` (priority: 0.7)
- Legal Pages (falls vorhanden): `/impressum`, `/datenschutz`, `/agb`, `/widerruf` (priority: 0.5)

**Features:**
- Dynamische Generierung aus Datenbank
- `lastModified` basierend auf `updatedAt`
- `changeFrequency` (daily/weekly/monthly)
- Prioritäten für wichtige Seiten

**URL:** `http://localhost:3000/sitemap.xml`

### 17.6 Caching Strategy

**Erstellt: `src/lib/cache/prisma-cache.ts`**

**Cached Functions:**
- `cachedPageBySlug(slug)`: Page mit Tag `page:${slug}` und `pages`
- `cachedCourseById(id)`: Course mit Tag `course:${id}` und `courses`
- `cachedVideoCourseById(id)`: VideoCourse mit Tag `videoCourse:${id}` und `video-courses`
- `cachedPublishedPages()`: Liste aller published Pages

**Konfiguration:**
- Revalidate: 3600 Sekunden (1 Stunde)
- Tag-basierte Revalidation bei Admin-Änderungen

### 17.7 Revalidation in Admin APIs

**Implementiert in:**
- `src/app/api/pages/route.ts`: `revalidateTag()` bei CREATE
- `src/app/api/pages/[id]/route.ts`: `revalidateTag()` bei UPDATE/DELETE
- `src/app/api/courses/route.ts`: `revalidateTag()` bei CREATE
- `src/app/api/courses/[id]/route.ts`: `revalidateTag()` bei UPDATE/DELETE
- `src/app/api/video-courses/route.ts`: `revalidateTag()` bei CREATE
- `src/app/api/video-courses/[id]/route.ts`: `revalidateTag()` bei UPDATE/DELETE

**Revalidation Flow:**
1. Admin ändert Content (Page/Course/VideoCourse)
2. API Route führt `revalidateTag(tagEntity(id))` und `revalidateTag(tagEntities())` aus
3. Next.js Cache wird invalidiert
4. Nächste Request rendert frischen Content

**Admin-Bereich:**
- `export const dynamic = "force-dynamic"` in Admin Layout
- `export const cache = "no-store"` für Admin Pages
- Kein Caching für Admin-Inhalte

### 17.8 Metadata & OpenGraph Tags

**Implementiert in:**

#### 17.8.1 `src/app/[slug]/page.tsx`
- `generateMetadata()` mit:
  - Title: `${page.title} | Familien Herz Zeit`
  - Description: Aus `contentJson` extrahiert (max 160 Zeichen)
  - Canonical URL
  - OpenGraph Tags
  - Twitter Cards

#### 17.8.2 `src/app/kurse/[id]/page.tsx`
- `generateMetadata()` mit:
  - Title: `${course.title} | Familien Herz Zeit`
  - Description: Aus `course.description` (max 160 Zeichen)
  - Canonical URL
  - OpenGraph Tags

#### 17.8.3 `src/app/videokurse/[slug]/page.tsx`
- `generateMetadata()` mit:
  - Title: `${videoCourse.title} | Familien Herz Zeit`
  - Description: Aus `videoCourse.description` (max 160 Zeichen)
  - Canonical URL
  - OpenGraph Tags
  - Image: `videoCourse.thumbnailUrl` (falls vorhanden)

### 17.9 Error Pages

**Erstellt: `src/app/not-found.tsx`**
- Freundliche 404-Seite im Site-Design
- Links zu Home, Kurse, Videokurse

**Erstellt: `src/app/error.tsx`**
- Global Error Boundary (Client Component)
- "Ups, da ist etwas schiefgelaufen" Meldung
- Button "Seite neu laden" (`reset()`)
- Error ID in Development Mode

### 17.10 Projekt-Struktur (nach Stunde 17)

```
src/
├── lib/
│   ├── seo/
│   │   ├── meta.ts              # SEO Helper Functions
│   │   └── tags.ts               # Cache Tag Functions
│   └── cache/
│       └── prisma-cache.ts       # Cached Prisma Queries
├── app/
│   ├── robots.ts                 # robots.txt Route
│   ├── sitemap.ts                # Dynamische Sitemap
│   ├── not-found.tsx             # 404 Page
│   ├── error.tsx                  # Error Boundary
│   ├── [slug]/
│   │   └── page.tsx              # Metadata erweitert
│   ├── kurse/[id]/
│   │   └── page.tsx              # Metadata erweitert
│   └── videokurse/[slug]/
│       └── page.tsx              # Metadata erweitert
```

### 17.11 Test-Flow

**1. robots.txt prüfen:**
```
http://localhost:3000/robots.txt
→ Sollte Disallow /admin, /api zeigen
→ Sollte Sitemap URL enthalten
```

**2. sitemap.xml prüfen:**
```
http://localhost:3000/sitemap.xml
→ Sollte alle publizierten URLs zeigen
→ Sollte lastModified und Prioritäten enthalten
```

**3. OG Meta Tags prüfen:**
```
1. Öffne eine Page: /{slug}
2. View Source (Strg+U)
3. Prüfe <meta property="og:title">, <meta property="og:description">
4. Prüfe <link rel="canonical">
```

**4. Revalidation testen:**
```
1. Öffne eine Page: /{slug}
2. Ändere Page im Admin
3. Öffne Page erneut (sollte aktualisiert sein)
```

---

## Schritt 18: Audit Log System (Stunde 16)

### 18.1 Übersicht

Vollständiges Audit Log System zur Nachverfolgung von Änderungen:
- **Wer** hat **was** **wann** geändert
- Tracking für: Pages, Courses, Bookings, VideoCourses, Series, Media, Users
- Admin UI für Suche und Filterung

### 18.2 Prisma Schema Erweiterung

**Hinzugefügt zu `prisma/schema.prisma`:**

```prisma
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  STATUS_CHANGE
  SYNC
  BATCH_UPDATE
  LOGIN
  OTHER
}

model AuditLog {
  id          String     @id @default(cuid())
  createdAt   DateTime   @default(now())
  actorUserId String?
  actorEmail  String?
  actor       User?      @relation("AuditLogActor", fields: [actorUserId], references: [id], onDelete: SetNull)
  entityType  String     // z.B. "Page", "Course", "Booking", etc.
  entityId    String?
  entityLabel String?    // Snapshot: Page.slug oder Course.title
  action      AuditAction
  message     String?
  meta        Json?      // Zusatzinfos: changedFields[], oldStatus/newStatus, etc.

  @@index([createdAt])
  @@index([entityType])
  @@index([entityId])
  @@index([actorUserId])
}
```

**Migration:**
```bash
npx prisma migrate dev --name audit_log
npx prisma generate
```

### 18.3 Central Audit Log Helper

**Erstellt: `src/lib/audit/log.ts`**

**Funktionen:**

#### `logAudit(params)`
```typescript
interface LogAuditParams {
  actor: { userId?: string; email?: string };
  entity: { type: string; id?: string; label?: string };
  action: AuditAction;
  message?: string;
  meta?: Record<string, any>;
}
```

**Features:**
- Schreibt Audit Log Eintrag in Datenbank
- Error Handling (loggt Fehler, verhindert aber keine Operationen)
- JSON Serialization für `meta` Feld

#### `getActorFromSession()`
- Extrahiert `userId` und `email` aus NextAuth Session
- Wird in API Routes verwendet

#### `getChangedFields(oldData, newData, fieldsToCompare)`
- Vergleicht alte und neue Daten
- Gibt Liste der geänderten Felder zurück
- Wird für `UPDATE` Actions verwendet

### 18.4 API Integration

**Integriert in folgenden API Routes:**

#### Pages:
- `POST /api/pages`: CREATE Action
- `PUT /api/pages/[id]`: UPDATE Action (mit changedFields)
- `DELETE /api/pages/[id]`: DELETE Action

#### Courses:
- `POST /api/courses`: CREATE Action
- `PUT /api/courses/[id]`: UPDATE Action (mit changedFields)
- `DELETE /api/courses/[id]`: DELETE Action

#### VideoCourses:
- `POST /api/video-courses`: CREATE Action
- `PUT /api/video-courses/[id]`: UPDATE Action (mit changedFields)
- `DELETE /api/video-courses/[id]`: DELETE Action

#### Bookings:
- `PATCH /api/admin/bookings/[id]`: STATUS_CHANGE Action

#### Media:
- `POST /api/media`: CREATE Action
- `DELETE /api/media/[id]`: DELETE Action

#### CourseSeries:
- `POST /api/course-series`: CREATE Action
- `PUT /api/course-series/[id]`: UPDATE Action (mit changedFields)
- `POST /api/course-series/[id]/sync`: SYNC Action
- `POST /api/course-series/[id]/batch-update`: BATCH_UPDATE Action

#### Users:
- `POST /api/admin/users`: CREATE Action
- `PATCH /api/admin/users/[id]`: UPDATE Action (mit changedFields)
- `POST /api/admin/users/[id]/set-password`: OTHER Action

**Wichtige Regeln:**
- Keine sensiblen Daten (Passwörter, Secrets) in Logs
- `meta` enthält nur harmlose Daten (IDs, Counts, Status, changedFields)

### 18.5 Admin UI - Activity Log

**Erstellt: `src/app/admin/activity/page.tsx`**
- Server Component
- ADMIN-only Zugriff
- Lädt alle Users für Actor-Filter

**Erstellt: `src/components/admin/activity/activity-log.tsx`**
- Client Component für Display und Filterung

**Features:**
- **Filter:**
  - EntityType (Page, Course, Booking, Media, User, VideoCourse, CourseSeries)
  - Action (CREATE, UPDATE, DELETE, STATUS_CHANGE, SYNC, BATCH_UPDATE, LOGIN, OTHER)
  - Actor (User Dropdown)
  - Textsuche (Nachricht, Actor-Email, Entity-Label)
  - Datum (Von/Bis)

- **Tabelle:**
  - Timestamp (formatiert mit date-fns)
  - Actor (Email + Role)
  - Action (Badge mit Farben)
  - EntityType + Label
  - Message
  - Details (expandable, zeigt `meta` als JSON)

- **Links:**
  - Links zu Admin Detail Pages (z.B. `/admin/pages/[id]`)
  - Fallback zu Listen-Seiten wenn Detail Page nicht existiert

- **Pagination:**
  - 50 Einträge pro Seite
  - Navigation (Zurück/Weiter)

**API Endpoint: `GET /api/admin/audit-logs`**

**Query Parameters:**
- `entityType`: Filter nach Entity-Typ
- `action`: Filter nach Action
- `actorUserId`: Filter nach Actor
- `q`: Textsuche
- `from`: Datum von (ISO String)
- `to`: Datum bis (ISO String)
- `take`: Anzahl Einträge (max 200)
- `skip`: Offset für Pagination

**Response:**
```json
{
  "logs": [...],
  "totalCount": 1234
}
```

### 18.6 Navigation Integration

**Angepasst: `src/components/admin/admin-sidebar.tsx`**

**Hinzugefügt:**
- Link "Aktivitäten" im "Einstellungen" Submenu
- Sichtbar nur für ADMIN
- Route: `/admin/activity`

### 18.7 Projekt-Struktur (nach Stunde 16)

```
src/
├── lib/
│   └── audit/
│       └── log.ts                    # Audit Log Helper
├── app/
│   ├── admin/
│   │   └── activity/
│   │       └── page.tsx             # Activity Log Page
│   └── api/
│       └── admin/
│           └── audit-logs/
│               └── route.ts         # GET /api/admin/audit-logs
└── components/
    └── admin/
        └── activity/
            └── activity-log.tsx    # Activity Log Component
```

### 18.8 Test-Flow

**1. Audit Log erstellen:**
```
1. Als Admin einloggen
2. Eine Page erstellen/bearbeiten/löschen
3. Zu /admin/activity navigieren
4. Eintrag sollte sichtbar sein
```

**2. Filter testen:**
```
1. Filter nach EntityType: "Page"
2. Filter nach Action: "CREATE"
3. Textsuche: "erstellt"
4. Datum-Filter setzen
```

**3. Details anzeigen:**
```
1. Auf "Anzeigen" klicken
2. Meta-JSON sollte expandiert werden
3. changedFields sollten sichtbar sein
```

---

## Schritt 19: Weitere Features (Übersicht)

### 19.1 Media Management

**Model:** `Media`
- Upload von Bildern und Videos
- Speicherung in `/public/uploads`
- Admin UI für Media-Verwaltung
- Integration in Page Builder

**API Routes:**
- `GET /api/media`: Liste aller Media
- `POST /api/media`: Upload (multipart/form-data)
- `DELETE /api/media/[id]`: Löschen

### 19.2 Courses System

**Model:** `Course`
- Einzelne Kurstermine
- Status: DRAFT, PUBLISHED, CANCELLED
- Buchungen möglich
- Öffentliche Detail-Seiten
- AOK-Gutschein Support (`acceptsAokVoucher`)

**Model:** `CourseSession`
- Mehrere Termine pro Kurs möglich
- Jeder Termin hat eigenes Datum, Uhrzeit und Dauer
- Relation zu `Course` (1:N)
- Relation zu `Booking` (optional, für spezifische Termin-Buchungen)

**Features:**
- Kalender-Ansicht (alle Termine werden angezeigt)
- Buchungsformular
- Verfügbare Plätze Tracking
- Integration mit CourseSeries
- Mehrere Termine pro Kurs
- Separate Datum/Zeit-Eingabe pro Termin
- Dauer pro Termin konfigurierbar
- AOK-Gutschein Option (kostenloser Kurs bei vorhandenem Gutschein)

### 19.3 VideoCourses System

**Model:** `VideoCourse`
- Videokurse mit Zugriffstokens
- Status: DRAFT, PUBLISHED
- Payment Integration (Stripe, PayPal)
- Video-Player mit Token-Authentifizierung

**Features:**
- Öffentliche Detail-Seiten
- Purchase Flow
- Access Token Management
- Video-Player mit Token-Validierung

### 19.4 CourseSeries System

**Model:** `CourseSeries`
- Wiederkehrende Kurstermine
- Recurrence Pattern (WEEKLY)
- Automatische Kurs-Generierung
- Batch-Update Funktionalität

**Features:**
- Sync-Funktion (erstellt/aktualisiert/löscht Kurse)
- Batch-Update (Massenänderungen)
- Timezone-Support (Europe/Berlin)
- Weekday-Selection (Mo-So)

### 19.5 Bookings System

**Model:** `Booking`
- Buchungen für Kurse
- Status: PENDING, CONFIRMED, CANCELLED
- Parent/Child Information (detaillierte Felder)
- Email-Benachrichtigungen
- Optional: Spezifische Session-Buchung (`sessionId`)
- AOK-Gutschein Support (`hasAokVoucher`)

**Felder:**
- **Elternteil:** `firstName`, `lastName`, `street`, `zipCode`, `city`, `email`, `phone`
- **Kind:** `childFirstName`, `childLastName`, `childBirthDate`, `childNotes`
- **Weitere:** `howDidYouHear`, `privacyAccepted`, `termsAccepted`
- **Legacy-Felder:** `parentName`, `childName`, `childAgeMonths` (für Backward Compatibility)

**Features:**
- Öffentliches Buchungsformular (Du-Form)
- Admin-Verwaltung
- Status-Änderungen
- Email-Bestätigungen
- AOK-Gutschein Checkbox (nur wenn Kurs `acceptsAokVoucher` aktiviert hat)
- Dynamische Preis-Anzeige (0 EUR bei AOK-Gutschein)
- Validierung aller Pflichtfelder
- Honeypot-Feld (`website`) für Spam-Schutz
- Links zu Datenschutzerklärung und Kursbedingungen

**API Route:** `POST /api/bookings`

**Technische Details:**
- **Lazy Imports:** Module werden dynamisch geladen, um Import-Fehler zu vermeiden
  - `getDb()`: Lädt Prisma Client lazy
  - `getBookingSchema()`: Lädt Zod Schema lazy
  - `getEmailFunctions()`: Lädt E-Mail-Funktionen lazy (optional)
- **Robuste Fehlerbehandlung:**
  - JSON-Parsing-Fehler werden abgefangen
  - Validierungsfehler werden detailliert zurückgegeben
  - Datenbankfehler werden einzeln abgefangen (findUnique, count, create)
  - E-Mail-Fehler sind nicht kritisch (Buchung wird trotzdem gespeichert)
  - Datenbankverbindungsfehler werden erkannt (503 Service Unavailable)
  - Unique Constraint Violations (Doppelbuchungen) werden erkannt (409 Conflict)
  - Fallback-Response falls selbst die Error-Response fehlschlägt
- **E-Mail-Integration:**
  - Prüft ob E-Mail konfiguriert ist (`isEmailConfigured()`)
  - Sendet Bestätigungs-E-Mail an User (wenn konfiguriert)
  - Sendet Admin-Benachrichtigung (wenn `MAIL_ADMIN_TO` gesetzt)
  - Verwendet Template-Renderer für E-Mail-Generierung
  - Erste zukünftige Session wird für E-Mail verwendet
- **Session-Integration:**
  - Prüft ob Kurs zukünftige Sessions hat
  - Verwendet erste zukünftige Session für E-Mail-Benachrichtigungen
  - Unterstützt optionale spezifische Session-Buchung

### 19.6 Invoices System

**Model:** `Invoice`, `InvoiceSettings`
- Automatische Rechnungsgenerierung
- PDF-Erstellung
- Rechnungsnummern-Management
- Kleinunternehmerregelung Support

**Features:**
- PDF-Generierung mit PDFKit
- Rechnungsnummern mit Prefix/Suffix
- MwSt-Berechnung
- Admin-Verwaltung

### 19.7 Navigation Management

**Model:** `NavigationItem`
- Hierarchische Navigation
- Header und Footer Navigation
- Drag & Drop Reordering
- Admin UI für Verwaltung

**Features:**
- Mehrstufige Menüs
- Order-Management
- Parent-Child Beziehungen
- Dynamisches Rendering
- Top-Bar Integration (obere Kontaktleiste über der Hauptnavigation)

### 19.8 Settings Management

**Model:** `SiteSettings`
- Key-Value Store für Einstellungen
- Admin UI für Verwaltung
- Environment Variable Management

**Features:**
- Website-Einstellungen
- Rechnungs-Einstellungen
- Environment Variable Editor
- System-Logs Viewer
- Top-Bar Konfiguration (obere Kontaktleiste)

#### 19.8.1 Top-Bar Konfiguration

Die obere Kontaktleiste (Top-Bar) kann vollständig im Admin-Bereich unter **Settings** konfiguriert werden.

**Komponente:** `src/components/navigation/top-contact-bar.tsx`

**Konfigurierbare Eigenschaften:**
- **Aktivierung:** Ein/Aus-Schalter für die Leiste
- **Hintergrundfarbe:** Hex-Farbcode (z.B. `#2563eb` für blau)
- **Textfarbe:** Hex-Farbcode (z.B. `#ffffff` für weiß)
- **Höhe:** In Pixel (empfohlen: 30-50px, Standard: 40px)
- **Einträge:** Dynamische Liste von Kontaktelementen

**Eintrags-Typen:**
1. **Telefon** (`phone`)
   - Symbol: ☎ (Unicode U+260E)
   - Erstellt automatisch `tel:`-Link
   - Felder: `label` (Anzeigetext), `value` (Telefonnummer ohne Leerzeichen)

2. **E-Mail** (`email`)
   - Symbol: ✉ (Unicode U+2709)
   - Erstellt automatisch `mailto:`-Link
   - Felder: `label` (Anzeigetext), `value` (E-Mail-Adresse)

3. **Text** (`text`)
   - Kein Link, nur statischer Text
   - Felder: `label` (Anzeigetext)

4. **Link** (`link`)
   - Beliebiger Link (intern oder extern)
   - Felder: `label` (Anzeigetext), `href` (URL), `value` (optional)

**Datenstruktur:**
Die Konfiguration wird als JSON in `SiteSettings` mit dem Key `top_bar_config` gespeichert:

```json
{
  "enabled": true,
  "backgroundColor": "#2563eb",
  "textColor": "#ffffff",
  "height": 40,
  "items": [
    {
      "type": "phone",
      "label": "0174 / 837 24 63",
      "value": "01748372463"
    },
    {
      "type": "email",
      "label": "info@familien-herz-zeit.de",
      "value": "info@familien-herz-zeit.de"
    }
  ]
}
```

**Standard-Werte:**
- Wenn keine Konfiguration vorhanden ist, werden Standard-Werte verwendet
- Backward Compatibility: Alte Konfigurationen ohne `height` erhalten automatisch 40px

**Verwendung:**
- Die Top-Bar wird automatisch über der Hauptnavigation angezeigt
- Wird nicht auf Admin-Seiten angezeigt (`/admin/*`)
- Responsive Design: Auf mobilen Geräten zentriert, auf Desktop rechtsbündig
- Live-Vorschau im Admin-Bereich

**Admin-Interface:**
- **Pfad:** `/admin/settings`
- **Komponente:** `src/components/settings/settings-form.tsx`
- **Features:**
  - Color Picker für Hintergrund- und Textfarbe
  - Hex-Eingabefeld für präzise Farbwerte
  - Höhen-Input mit Min/Max-Validierung (20-100px)
  - Einträge hinzufügen/entfernen/bearbeiten
  - Live-Vorschau mit konfigurierter Höhe
  - Speicherung über `/api/settings` (PUT)

**Technische Details:**
- Client-Side Rendering (`"use client"`)
- Lädt Settings beim Mount via `/api/settings`
- Fallback auf Standard-Werte bei Fehlern
- Hydration-safe (wartet auf Mount)

### 19.9 User Management

**Model:** `User`
- Rollen: ADMIN, EDITOR, CUSTOMER
- User-Verwaltung im Admin
- Passwort-Set/Reset
- Aktiv/Inaktiv Toggle

**Features:**
- Admin UI für User-Verwaltung
- Rollen-Management
- Passwort-Set für neue User
- Aktiv/Inaktiv Status

### 19.10 Payment Integration

**Stripe:**
- Checkout Sessions
- Webhook Handler
- Payment Intent Management
- Invoice Generation

**PayPal:**
- Order Creation
- Capture Handler
- Webhook Support
- Invoice Generation

**Features:**
- Beide Provider unterstützt
- Automatische Invoice-Generierung
- Webhook-Verarbeitung
- Error Handling

---

## Zusammenfassung aller Features

Das Projekt umfasst:

✅ **Grundlagen:**
- Next.js 14+ App Router
- TypeScript (strict mode)
- Tailwind CSS 4
- Prisma 7 mit PostgreSQL
- NextAuth v4 (Credentials)

✅ **Content Management:**
- Pages CRUD System
- Page Builder (12 Block-Typen: Hero, Text, RichText, Image, Video, Features, Testimonials, CTA, Spacer, Table, Section, Reusable)
- Block Templates (vorgefertigte Layouts)
- Sections (Block-Gruppierung)
- Reusable Blocks (globale Blöcke)
- Content Validation (Draft/Publish Mode)
- Undo/Redo System
- Media Management
- Navigation Management
- Top-Bar Konfiguration (obere Kontaktleiste mit konfigurierbaren Farben, Höhe und Einträgen)
- Page Templates (HTML-Templates für Header, Body, Footer mit benutzerdefiniertem CSS)

✅ **Kurs-System:**
- Courses (Einzeltermine)
- CourseSession (Mehrere Termine pro Kurs)
- CourseSeries (Wiederkehrende Termine)
- Bookings System (mit AOK-Gutschein Support)
- Kalender-Ansicht (alle Termine)
- Zeitzone-Behandlung (Europe/Berlin → UTC)
- Separate Datum/Zeit-Eingabe pro Termin

✅ **Video-System:**
- VideoCourses
- Access Token Management
- Video-Player
- Purchase Flow

✅ **Payment:**
- Stripe Integration
- PayPal Integration
- Invoice Generation
- PDF-Rechnungen

✅ **Admin Features:**
- RBAC (Role-Based Access Control)
- Audit Log System
- System Logs
- Settings Management
- User Management
- Page Template Management (HTML-Templates mit Header/Body/Footer)

✅ **SEO & Performance:**
- robots.txt
- Dynamische Sitemap
- OpenGraph/Twitter Meta Tags
- Canonical URLs
- Caching & Revalidation
- 404 & Error Pages

✅ **Weitere Features:**
- Email-Benachrichtigungen
- PDF-Generierung
- Timezone-Support
- Responsive Design
- Error Handling & Recovery Mode
- Performance-Optimierungen (Memoization, Debouncing)
- Bildgrößen-Option (10-200%)
- Tabellen ohne Rahmen

---

## Schritt 20: Page Builder Erweiterungen (PB-7 & PB-8)

### 20.1 Übersicht

**PB-7 (1 Stunde): Block Templates + Sections + Reusable Blocks**

Erweiterung des Page Builders zu einem professionellen CMS-Tool mit vorgefertigten Layouts, Sections für Gruppierung und globalen/reusable Blöcken.

**PB-8 (1 Stunde): Qualität & Abschluss**

Production-Ready Features: Content Validation, Error Handling, Performance-Optimierungen, Recovery Mode und UX-Verbesserungen.

### 20.2 PB-7: Sections

**Ziel:** Blöcke in Sections gruppieren und als Einheit verschieben.

**Schema-Erweiterung:**

**`src/lib/page-builder/types.ts`:**
```typescript
export type BlockType = 
  | "hero" | "text" | "richText" | "image" | "video" 
  | "features" | "testimonials" | "cta" | "spacer" | "table"
  | "section"  // NEU
  | "reusable"; // NEU

export interface SectionBlockData {
  title?: string;
  layout?: "default" | "narrow";
  background?: "none" | "soft";
  padding?: "sm" | "md" | "lg";
  children: Block[];  // Rekursive Struktur
}
```

**Features:**
- Sections als Container-Blöcke mit `children: Block[]`
- DnD auf Section-Ebene (ganze Sections verschieben)
- Section-Einstellungen: Layout, Hintergrund, Padding
- Rekursive Validierung für Section-Children

**Implementierung:**
- `SectionCanvasComponent`: Rendert Container mit Children
- `SectionInspectorComponent`: Einstellungen für Section
- Actions: `ADD_SECTION`, `ADD_BLOCK_TO_SECTION`, `UPDATE_SECTION`, `REMOVE_CHILD_FROM_SECTION`, `DUPLICATE_SECTION`

### 20.3 PB-7: Block Templates

**Ziel:** Vorgefertigte Layouts als Templates einfügen.

**Erstellt: `src/lib/page-builder/block-templates.ts`**

**Template-Definition:**
```typescript
export interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  blocksFactory: () => Block[];
}

export const templates: BlockTemplate[] = [
  {
    id: "hero-features-cta",
    name: "Startseite Hero",
    description: "Hero + Features + CTA",
    blocksFactory: () => [
      createBlock("hero"),
      createBlock("features"),
      createBlock("cta"),
    ],
  },
  // ... weitere Templates
];
```

**Features:**
- Templates in Block Library verfügbar
- Ein Klick fügt alle Blocks des Templates ein
- Templates sind Factory-Funktionen (jeder Block bekommt neue ID)

**Integration:**
- Block Library zeigt "Templates" Tab
- `ADD_TEMPLATE` Action im Builder State

### 20.4 PB-7: Reusable Blocks (Global Blocks)

**Ziel:** Blöcke/Sections als "Reusable Blocks" speichern und mehrfach verwenden.

**Prisma Schema:**
```prisma
model ReusableBlock {
  id         String   @id @default(cuid())
  name       String
  contentJson Json    // Enthält einen Block (kann auch Section sein)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Content Schema:**
```typescript
export interface ReusableBlockData {
  reusableId: string;
}

// Block-Typ erweitert:
export type BlockType = ... | "reusable";
```

**API Endpoints:**
- `GET /api/reusable-blocks` - Liste aller Reusable Blocks
- `POST /api/reusable-blocks` - Neuen Reusable Block erstellen
- `GET /api/reusable-blocks/[id]` - Einzelnen Block abrufen
- `PUT /api/reusable-blocks/[id]` - Block aktualisieren
- `DELETE /api/reusable-blocks/[id]` - Block löschen

**Features:**
- "Als Reusable speichern" Button im Inspector
- "Reusable einfügen" in Block Library
- Server-side Resolution: `ReusableBlockRenderer` lädt Content aus DB
- Client-side Preview: Placeholder im Builder

**Implementierung:**
- `ReusableBlockRenderer` (Server Component): Lädt Block aus DB und rendert
- `ReusableCanvasComponent` (Client Component): Zeigt Placeholder im Builder
- `ADD_REUSABLE` Action im Builder State

### 20.5 PB-8: Content Validation

**Ziel:** Block-spezifische Validierung mit Zod Schemas.

**Erstellt: `src/lib/page-builder/validate.ts`**

**Validation System:**
```typescript
export function validateContent(
  content: PageContentV1,
  opts?: { mode?: "draft" | "publish" }
): { errors: ValidationIssue[]; warnings: ValidationIssue[] }

interface ValidationIssue {
  path: string;
  message: string;
  level: "error" | "warning";
}
```

**Block Registry erweitert:**
```typescript
export interface BlockRegistryEntry {
  type: BlockType;
  label: string;
  icon: string;
  defaultData: () => Record<string, any>;
  CanvasComponent: ComponentType<{ block: Block }>;
  InspectorComponent: ComponentType<{ block: Block; onChange: (block: Block) => void }>;
  schema: z.ZodTypeAny;  // NEU: Zod Schema für Block Data
}
```

**Validierungsregeln:**

**Publish Mode (strict):**
- Image ohne Alt-Text → Error
- Hero ohne Überschrift → Error
- Features/Testimonials ohne Items → Error
- Reusable Block ohne ID → Error

**Draft Mode (lenient):**
- Image ohne Alt-Text → Warning
- Reusable Block ohne ID → Warning
- Optionale Felder können leer sein

**Rekursive Validierung:**
- Sections: Validiert alle Children rekursiv
- Fehler-Pfade: `blocks[0].data.children[1].data.heading`

**UI Integration:**
- `ValidationPanel`: Zeigt Errors/Warnings
- Klick auf Issue → Selektiert entsprechenden Block
- Publish blockiert bei Errors, erlaubt bei Warnings

### 20.6 PB-8: Error Handling & Recovery

**Recovery Mode:**

**Schema erweitert:**
```typescript
export function parsePageContent(input: unknown): PageContentV1 & { 
  recovery?: { 
    hadError: boolean; 
    originalSnippet?: string 
  } 
}
```

**Features:**
- Erkennt ungültiges `contentJson`
- Lädt Builder in "Recovery Mode" mit Banner
- Zeigt Original-Snippet (erste 500 Zeichen)
- "Zurücksetzen" Button erstellt leeren Content

**Error Handling:**
- API Errors werden in UI angezeigt (nicht nur Console)
- Renderer: `try/catch` um Block-Rendering
- Defekte Blocks zeigen "Block defective" Card statt Crash
- HTTP Utility: `fetchJson` für konsistente Error-Behandlung

**Erstellt: `src/lib/utils/http.ts`**
```typescript
export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}
```

### 20.7 PB-8: Performance-Optimierungen

**Canvas Optimierung:**
- `React.memo` für `SortableBlockItem` und `BlockPreview`
- Stabile Callbacks mit `useCallback`
- Inspector Inputs: Debouncing (500ms für Text-Inputs)

**Builder State:**
- Actions wrapped in `useCallback`
- History Management: Max 50 Einträge
- Auto-Commit: Debounced für Text-Inputs, sofort für andere Actions

**Undo/Redo System:**
- History wird bei jeder Action sofort committet (außer UPDATE_BLOCK)
- Keyboard Shortcuts: `Ctrl+Z` (Undo), `Ctrl+Shift+Z` / `Ctrl+Y` (Redo)
- Funktioniert auch in Input-Feldern (mit Capture-Phase Event-Handler)

### 20.8 PB-8: UX-Verbesserungen

**Empty States:**
- Leere Seiten: "Drag a block / Choose a template" Message
- Leerer Inspector: Hilfreiche Texte mit Keyboard-Shortcuts

**Toasts & Feedback:**
- Erfolgs-Toasts bei Save/Publish
- Error-Toasts bei API-Fehlern
- Disabled States für Buttons während Loading
- Loading Indicators bei API-Calls

**Admin Sidebar:**
- Einklappbar für mehr Platz
- `localStorage` Persistenz
- Hydration-safe (nur nach Mount lesen)

**Button Type Fixes:**
- Alle internen Buttons haben `type="button"`
- Verhindert ungewollte Form-Submissions
- Fix für "Editor schließt bei jedem Klick" Problem

### 20.9 PB-8: Bildgrößen-Option

**Erweiterung: `ImageBlockData`**
```typescript
export interface ImageBlockData {
  // ... bestehende Felder
  size?: number;  // Größe in Prozent (Standard: 100 = Originalgröße)
}
```

**Features:**
- Slider und Zahleneingabe im Inspector (10-200%)
- Standard: 100% (Originalgröße)
- Bei Originalgröße: normales `<img>` Tag (kein Next.js Image mit fill)
- Bei verkleinerten Bildern: Next.js Image mit prozentualer Breite

**Renderer-Logik:**
- `aspect: "auto"` + `size: 100%` → normales `<img>` Tag
- Andere Einstellungen → Next.js Image mit `fill`

### 20.10 PB-8: Tabellen ohne Rahmen

**Änderung:**
- Tabellen-Rahmen im Frontend entfernt
- Padding bleibt erhalten für bessere Lesbarkeit
- Nur im Server-Renderer angepasst (Client hatte bereits keine Borders)

### 19.11 Zeitzone-Behandlung und Datum/Zeit-Konvertierung

**Problem:**
- Datenbank speichert Datum/Zeit in UTC
- Frontend zeigt Datum/Zeit in lokaler Zeitzone (Europe/Berlin)
- Formulare verwenden separate `date` und `time` Felder
- Kalender muss Zeiten korrekt anzeigen

**Lösung:**
- Verwendung von Luxon für explizite Zeitzone-Konvertierungen
- Utility-Funktionen in `src/lib/utils/datetime-convert.ts`

**Funktionen:**

1. **`dateTimeToUtcDate(date: string, time: string): Date`**
   - Konvertiert separate `date` (YYYY-MM-DD) und `time` (HH:mm) Strings zu UTC Date
   - Interpretiert Eingabe als Zeit in Europe/Berlin
   - Wird verwendet beim Speichern von Kurs-Sessions

2. **`utcDateToDateTime(utcDate: Date): { date: string; time: string }`**
   - Konvertiert UTC Date (aus Datenbank) zu separaten date/time Strings
   - Zeigt Zeit in Europe/Berlin Zeitzone an
   - Wird verwendet beim Laden von Kurs-Sessions für Formulare

**Verwendung:**
- **Kurs-Formular:** Konvertiert UTC `startAt` aus DB zu lokalen `date`/`time` für Anzeige
- **API-Routen:** Konvertiert lokale `date`/`time` aus Formular zu UTC `startAt` für DB
- **Kalender:** FullCalendar mit `timeZone="local"` zeigt Zeiten korrekt an

**Wichtige Hinweise:**
- Alle Zeiten werden als Europe/Berlin interpretiert
- Datenbank speichert immer UTC
- Frontend zeigt immer lokale Zeit
- Luxon stellt sicher, dass Sommerzeit korrekt behandelt wird

### 20.11 Projekt-Struktur (nach PB-7 & PB-8)

```
src/
├── lib/
│   └── page-builder/
│       ├── types.ts              # Erweitert: Section, Reusable
│       ├── schema.ts             # Erweitert: Recovery Mode
│       ├── registry.tsx          # Erweitert: Schemas für alle Blocks
│       ├── validate.ts           # NEU: Content Validation
│       ├── block-templates.ts    # NEU: Template-Definitionen
│       └── ...
├── components/
│   ├── page-builder/
│   │   ├── section-block.tsx    # NEU: Section Canvas Component
│   │   ├── reusable-block.tsx    # NEU: Reusable Placeholder
│   │   ├── validation-panel.tsx  # NEU: Validation UI
│   │   └── ...
│   └── page-renderer/
│       ├── page-renderer-server.tsx  # Erweitert: Reusable Resolution
│       └── reusable-block-renderer.tsx  # NEU: Server Component
├── app/
│   └── api/
│       └── reusable-blocks/      # NEU: CRUD API
│           ├── route.ts
│           └── [id]/
│               └── route.ts
└── prisma/
    └── schema.prisma             # Erweitert: ReusableBlock Model
```

### 20.12 Zusammenfassung PB-7 & PB-8

**PB-7 Features:**
✅ Sections für Block-Gruppierung
✅ Block Templates (vorgefertigte Layouts)
✅ Reusable Blocks (globale Blöcke)
✅ DnD auf Section-Ebene
✅ Backward Compatibility

**PB-8 Features:**
✅ Block-spezifische Zod Validation
✅ Draft/Publish Mode (unterschiedliche Strictness)
✅ Recovery Mode für defekte Content
✅ Error Handling (UI + Renderer)
✅ Performance-Optimierungen (Memoization, Debouncing)
✅ Undo/Redo System
✅ UX-Verbesserungen (Empty States, Toasts, Loading)
✅ Bildgrößen-Option
✅ Tabellen ohne Rahmen

**Status:**
- Page Builder ist jetzt production-ready
- Alle Features getestet und stabil
- Backward Compatibility gewährleistet

---

## Schritt 21: Draft/Preview-Funktionalität für Page Builder

### 21.1 Übersicht

**Ziel:** Implementierung eines Draft/Publish-Workflows mit Preview-Links für den Page Builder. Redakteure können Änderungen als Entwurf speichern, Vorschau-Links generieren und erst nach Prüfung veröffentlichen.

### 21.2 Datenmodell-Erweiterung

**Prisma Schema (`prisma/schema.prisma`):**

```prisma
model Page {
  id                   String    @id @default(cuid())
  slug                 String    @unique
  title                String
  contentJson          Json      // Legacy - wird für Backward Compatibility behalten
  draftContentJson     Json?     // Entwurf (wird im Builder bearbeitet)
  publishedContentJson Json?     // Veröffentlichte Version (nur wenn published=true)
  published            Boolean   @default(false)
  publishedAt          DateTime? // Wann wurde veröffentlicht
  previewToken         String?   @unique // Token für Preview-Link
  previewTokenExpires  DateTime? // Optional: Token Ablaufdatum
  showTitle            Boolean   @default(true)
  containerWidth       String?   @default("medium")
  updatedAt            DateTime  @updatedAt
  createdAt            DateTime  @default(now())
}
```

**Felder:**
- **`draftContentJson`**: Enthält den aktuellen Entwurf, der im Page Builder bearbeitet wird
- **`publishedContentJson`**: Enthält die veröffentlichte Version (wird nur bei `published=true` gesetzt)
- **`contentJson`**: Legacy-Feld für Backward Compatibility (wird weiterhin verwendet, wenn `draftContentJson` leer ist)
- **`previewToken`**: Eindeutiger Token für Preview-Links (32 Bytes, base64url-encodiert)
- **`previewTokenExpires`**: Optionales Ablaufdatum für Preview-Token (Standard: 30 Tage)

### 21.3 Workflow

**1. Bearbeitung im Page Builder:**
- Beim Öffnen einer Seite im Edit-Modus wird `draftContentJson` geladen (mit Fallback auf `contentJson` für Backward Compatibility)
- Alle Änderungen werden als Draft gespeichert (`draftContentJson`)
- Der "Speichern"-Button im Page Builder speichert nur den Draft, nicht die veröffentlichte Version

**2. Preview-Link generieren:**
- Button "Preview-Link generieren" im Page Builder Shell
- Erstellt/rotiert einen Preview-Token via `POST /api/pages/[id]/preview-token`
- Token ist 30 Tage gültig
- Preview-Link: `/preview/[slug]?token=[token]`

**3. Veröffentlichung:**
- Button "Veröffentlichen" im Page Builder Shell
- Kopiert `draftContentJson` → `publishedContentJson`
- Setzt `published = true` und `publishedAt = now()`
- Revalidiert Cache-Tags für SEO

**4. Öffentliche Anzeige:**
- Veröffentlichte Seiten (`published = true`): Zeigen `publishedContentJson` (mit Fallback auf `contentJson`)
- Preview-Links: Zeigen `draftContentJson` (mit Fallback auf `contentJson`)

### 21.4 API Endpoints

#### 21.4.1 Preview Token erstellen/rotieren

**Route:** `POST /api/pages/[id]/preview-token`

**Funktionalität:**
- Erstellt einen neuen Preview-Token (32 Bytes)
- Setzt Ablaufdatum auf 30 Tage in der Zukunft
- Rotiert bestehenden Token (überschreibt alten Token)
- Audit-Log Eintrag

**Response:**
```json
{
  "token": "abc123..."
}
```

**Implementierung:** `src/app/api/pages/[id]/preview-token/route.ts`

#### 21.4.2 Seite veröffentlichen

**Route:** `POST /api/pages/[id]/publish`

**Funktionalität:**
- Validiert `draftContentJson` (mit Fallback auf `contentJson`)
- Kopiert Draft → `publishedContentJson`
- Setzt `published = true` und `publishedAt = now()`
- Revalidiert Cache-Tags (`tagPage(slug)`, `tagPages()`)
- Audit-Log Eintrag

**Response:**
```json
{
  "ok": true,
  "page": { ... }
}
```

**Implementierung:** `src/app/api/pages/[id]/publish/route.ts`

#### 21.4.3 Seite aktualisieren (PUT)

**Route:** `PUT /api/pages/[id]`

**Änderungen:**
- Unterstützt jetzt `draftContentJson` als separaten Parameter
- Wenn `draftContentJson` gesendet wird, wird es als Draft gespeichert
- `contentJson` wird weiterhin unterstützt (für Backward Compatibility)
- Bei Update wird `draftContentJson` validiert und normalisiert

**Payload:**
```json
{
  "title": "...",
  "slug": "...",
  "draftContentJson": { ... },  // NEU: Draft Content
  "contentJson": { ... }        // Legacy: wird weiterhin unterstützt
}
```

**Implementierung:** `src/app/api/pages/[id]/route.ts`

### 21.5 Preview-Route

**Route:** `/preview/[slug]?token=[token]`

**Funktionalität:**
- Validiert Preview-Token (muss mit `page.previewToken` übereinstimmen)
- Prüft Token-Ablaufdatum (falls gesetzt)
- Zeigt `draftContentJson` (mit Fallback auf `contentJson`)
- Zeigt Banner mit Link zurück zum Builder
- Nicht indexierbar (robots meta tags)

**Implementierung:** `src/app/preview/[slug]/page.tsx`

**Features:**
- SEO: `robots: { index: false, follow: false }`
- Banner: "Vorschau-Modus" mit Link zum Builder
- Responsive Design
- Container-Breite wird respektiert

### 21.6 Page Builder Shell Integration

**Komponente:** `src/components/page-builder/page-builder-shell.tsx`

**Neue Props:**
```typescript
interface PageBuilderShellProps {
  pageId: string;
  initialContentJson: any;
  pageSlug?: string;           // NEU: Für Preview-Link
  pagePublished?: boolean;      // NEU: Veröffentlichungsstatus
  pagePreviewToken?: string | null; // NEU: Bestehender Token
  onSave: (content: PageContentV1) => Promise<void>;
}
```

**Neue Features:**
- **Preview-Link Button:** Generiert/zeigt Preview-Link
- **Veröffentlichen Button:** Veröffentlicht Draft
- **Status-Anzeige:** Zeigt ob Seite veröffentlicht ist
- **Token-Management:** Zeigt bestehenden Token oder generiert neuen

**UI-Elemente:**
- Header mit Save/Preview/Publish Buttons
- Status-Badge (Draft/Published)
- Preview-Link Anzeige (mit Copy-Button)

### 21.7 Page Form Integration

**Komponente:** `src/components/pages/page-form.tsx`

**Änderungen:**
- Lädt `draftContentJson` mit Fallback auf `contentJson` beim Initialisieren
- Übergibt `pageSlug`, `pagePublished` und `pagePreviewToken` an `PageBuilderShell`
- `onSave` speichert als `draftContentJson` (nicht `contentJson`)
- Kein `router.refresh()` nach Save (verhindert Neuladung und schließt Editor nicht)

**Backward Compatibility:**
- Alte Seiten ohne `draftContentJson` funktionieren weiterhin
- Fallback auf `contentJson` bei fehlendem Draft

### 21.8 Öffentliche Seiten-Route

**Route:** `/[slug]`

**Änderungen:**
- Veröffentlichte Seiten (`published = true`): Zeigen `publishedContentJson` (mit Fallback auf `contentJson`)
- Nicht-veröffentlichte Seiten: Zeigen 404 (wie bisher)

**Implementierung:** `src/app/[slug]/page.tsx`

### 21.9 Sicherheit

**Preview-Token:**
- 32 Bytes zufällige Daten (kryptographisch sicher)
- Base64url-Encoding (URL-safe)
- Optionales Ablaufdatum (Standard: 30 Tage)
- Eindeutig pro Seite (`@unique` Constraint)

**Zugriffskontrolle:**
- Preview-Route: Nur mit gültigem Token zugänglich
- Token-Generierung: Nur für ADMIN/EDITOR
- Publish: Nur für ADMIN/EDITOR

**SEO:**
- Preview-Links sind nicht indexierbar (`robots: noindex, nofollow`)
- Veröffentlichte Seiten bleiben indexierbar

### 21.10 Backward Compatibility

**Migration:**
- Bestehende Seiten ohne `draftContentJson` funktionieren weiterhin
- `contentJson` wird als Fallback verwendet
- Beim ersten Save wird `draftContentJson` erstellt

**Legacy-Support:**
- API akzeptiert weiterhin `contentJson` (wird als Draft behandelt)
- Öffentliche Route verwendet `publishedContentJson` → `contentJson` → leer

### 21.11 Zusammenfassung

**Features:**
✅ Draft/Published Workflow
✅ Preview-Links mit Token-basierter Authentifizierung
✅ Separate Speicherung von Draft und Published Content
✅ Token-Rotation (Sicherheit)
✅ Optionales Token-Ablaufdatum
✅ Cache-Revalidierung bei Veröffentlichung
✅ Audit-Logging für alle Aktionen
✅ Backward Compatibility mit Legacy-Content

**Status:**
- Draft/Preview-Funktionalität ist vollständig implementiert
- Alle API-Endpoints getestet
- Preview-Route funktioniert mit Token-Validierung
- Page Builder Shell integriert alle Features

---

## Schritt 22: Dynamische Block-Typen und Navigation

### 22.1 Übersicht

**Ziel:** Erweiterung des Page Builders um dynamische Block-Typen, die Daten aus der Datenbank laden, sowie Verbesserung der Navigation mit verschachtelten Submenüs.

### 22.2 Dynamische Block-Typen

#### 22.2.1 Courses Block

**Block-Typ:** `"courses"`

**Zweck:** Zeigt automatisch veröffentlichte Kurse aus der Datenbank an.

**Datenstruktur:**
```typescript
export interface CoursesBlockData {
  maxCourses?: number;              // Max. Anzahl Kurse (Standard: 3)
  maxTopics?: number;                // Max. Anzahl Themenstunden (Standard: 3)
  showEmptyMessage?: boolean;        // Leere-Meldung anzeigen (Standard: true)
  backgroundImage?: MediaRef;        // Hintergrundbild (optional)
  backgroundImageOpacity?: number;   // Transparenz 0-100 (Standard: 75)
  title?: string;                    // Überschrift (Standard: "Entdecke die Welt der Babyzeichen")
  subtitle?: string;                 // Untertitel (Standard: "In unserer Master-Übersicht...")
}
```

**Features:**
- Automatisches Laden veröffentlichter Kurse
- Filterung nach Kursart (Babyzeichenkurse vs. Themenstunden)
- Chronologische Sortierung nach Datum
- Unterstützung für geplante Termine (Monat/Jahr ohne genaues Datum)
- Hintergrundbild mit konfigurierbarer Transparenz
- Anpassbare Überschrift und Untertitel

**Implementierung:**
- **Server Component:** `src/components/courses/courses-block.tsx`
- **Block Registry:** `src/lib/page-builder/registry.tsx`
- **Page Renderer:** Integriert in `page-renderer-server.tsx` und `page-renderer.tsx`

#### 22.2.2 Current Appointments Block

**Block-Typ:** `"currentAppointments"`

**Zweck:** Zeigt aktuelle Termine basierend auf ausgewählten Kursarten.

**Datenstruktur:**
```typescript
export interface CurrentAppointmentsBlockData {
  title?: string;                    // Überschrift (Standard: "Aktuelle Termine")
  courseTypes?: CourseCategory[];    // Kursarten: ["COURSE", "TOPIC", "AUTO"]
}
```

**Features:**
- Filterung nach Kursarten (Babyzeichenkurse, Themenstunden, Auto)
- Chronologische Sortierung
- Anzeige von Datum, Uhrzeit, Ort, Preis
- Link zu Kurs-Detailseite
- Leere-Meldung wenn keine Termine vorhanden

**Implementierung:**
- **Server Component:** `src/components/courses/current-appointments-block.tsx`
- **Block Registry:** `src/lib/page-builder/registry.tsx`
- **Page Renderer:** Integriert in `page-renderer-server.tsx` und `page-renderer.tsx`

### 22.3 Navigation-Verbesserungen

#### 22.3.1 Verschachtelte Submenüs

**Problem:** Beim Hover über ein Submenü wurden alle übergeordneten Submenüs geöffnet.

**Lösung:**
- Set-basierte Verwaltung geöffneter Submenüs (`hoveredSubmenus`)
- Nur das gehoverte Submenü wird angezeigt
- Übergeordnete Submenüs bleiben offen, wenn verschachtelte Submenüs geöffnet sind
- Timeout-Mechanismus für sanftes Schließen (200ms)

**Implementierung:**
- **Komponente:** `src/components/navigation/main-navigation-client.tsx`
- **State:** `hoveredSubmenus: Set<string>`
- **Event-Handler:** `onMouseEnter` / `onMouseLeave` mit Timeout-Management

#### 22.3.2 Menü schließen bei Klick

**Feature:** Beim Klick auf ein Menüelement werden alle offenen Menüs geschlossen.

**Implementierung:**
- `closeAllMenus()` Funktion:
  - Schließt Haupt-Dropdown
  - Leert alle gehoverten Submenüs
  - Löscht alle Timeouts
- `onClick` Handler auf allen Links

### 22.4 Admin-Verbesserungen

#### 22.4.1 Kursübersicht mit Ort

**Feature:** Ort-Spalte in der Admin-Kursübersicht hinzugefügt.

**Implementierung:**
- **Datei:** `src/app/admin/courses/page.tsx`
- **Neue Spalte:** "Ort" zwischen "Datum & Zeit" und "Status"
- **Anzeige:** `course.location` oder "Kein Ort angegeben" (kursiv, grau)

### 22.5 Projekt-Struktur (nach Schritt 22)

```
src/
├── components/
│   ├── courses/
│   │   ├── courses-block.tsx              # NEU: Courses Block Server Component
│   │   └── current-appointments-block.tsx # NEU: Current Appointments Block
│   └── navigation/
│       └── main-navigation-client.tsx    # ERWEITERT: Verschachtelte Submenüs
├── lib/
│   └── page-builder/
│       ├── types.ts                      # ERWEITERT: CoursesBlockData, CurrentAppointmentsBlockData
│       └── registry.tsx                  # ERWEITERT: Neue Block-Typen registriert
└── app/
    ├── admin/
    │   └── courses/
    │       └── page.tsx                  # ERWEITERT: Ort-Spalte hinzugefügt
    └── [slug]/
        └── page.tsx                      # Unterstützt neue Block-Typen
```

### 22.6 Test-Flow

**1. Courses Block hinzufügen:**
```
1. Page Builder öffnen
2. "Block hinzufügen" → "Kurse & Termine"
3. Konfigurieren:
   - Max. Kurse: 5
   - Hintergrundbild wählen
   - Transparenz: 80%
   - Titel/Untertitel anpassen
4. Speichern
5. Öffentliche Seite prüfen
```

**2. Current Appointments Block hinzufügen:**
```
1. Page Builder öffnen
2. "Block hinzufügen" → "Aktuelle Termine"
3. Konfigurieren:
   - Titel: "Nächste Termine"
   - Kursarten: Babyzeichenkurse + Themenstunden
4. Speichern
5. Öffentliche Seite prüfen
```

**3. Navigation testen:**
```
1. Über Submenü-Link hovern
2. Nur dieses Submenü sollte sich öffnen
3. Über verschachteltes Submenü hovern
4. Übergeordnetes Submenü bleibt offen
5. Auf Link klicken → Alle Menüs schließen
```

**4. Admin Kursübersicht:**
```
1. /admin/courses öffnen
2. Tabelle sollte "Ort"-Spalte zeigen
3. Ort wird für jeden Kurs angezeigt
```

### 22.7 Zusammenfassung

**Neue Features:**
✅ Courses Block (dynamische Kursanzeige)
✅ Current Appointments Block (filterbare Termine)
✅ Verschachtelte Submenüs in Navigation
✅ Menü schließt bei Klick auf Link
✅ Ort-Spalte in Admin-Kursübersicht

**Technische Details:**
- Server Components für Datenbank-Queries
- Set-basierte State-Verwaltung für Submenüs
- Timeout-Mechanismus für UX
- Backward Compatibility gewährleistet

---

## Schritt 23: Integration von Kalenderterminen in Rich-Text Blöcke

### 23.1 Übersicht

**Problem:** Statischer HTML-Code mit festen Terminen muss manuell aktualisiert werden und ist nicht mit dem Kalendersystem synchronisiert.

**Lösung:** Verwendung des dynamischen `courses` Block-Typs, der automatisch Termine aus der Datenbank lädt und anzeigt.

### 23.2 Statischer vs. Dynamischer Ansatz

#### 23.2.1 Statischer Ansatz (Nicht empfohlen)

**Beispiel:** Rich-Text Block mit fest codierten Terminen:

```html
<article class="event">
  <div class="meta">
    <span class="chip">04.12.25 – 19.02.26</span>
    <span class="chip">Do 9:00 & 10:20</span>
  </div>
  <h4>Kleine Hände – Große Schritte</h4>
  <div class="event-foot">
    <a class="details" href="#kurs1">Details</a>
    <span class="tag">Anfängerkurs</span>
  </div>
</article>
```

**Nachteile:**
- ❌ Manuelle Aktualisierung bei jeder Änderung
- ❌ Keine Synchronisation mit Kalender
- ❌ Fehleranfällig (veraltete Termine)
- ❌ Keine automatische Filterung (ausgebuchte Kurse, vergangene Termine)

#### 23.2.2 Dynamischer Ansatz (Empfohlen)

**Verwendung des `courses` Block-Typs:**

Der `courses` Block lädt automatisch veröffentlichte Kurse aus der Datenbank und zeigt sie in einem vorgefertigten Layout an.

**Vorteile:**
- ✅ Automatische Synchronisation mit Kalender
- ✅ Filterung nach Kursart (Babyzeichenkurse vs. Themenstunden)
- ✅ Chronologische Sortierung
- ✅ Unterstützung für geplante Termine (Monat/Jahr ohne genaues Datum)
- ✅ Anzeige von Verfügbarkeit (ausgebucht/verfügbar)
- ✅ Konfigurierbare Anzahl an Kursen
- ✅ Hintergrundbild mit Transparenz
- ✅ Anpassbare Überschriften

### 23.3 Courses Block Konfiguration

**Block-Typ:** `"courses"`

**Datenstruktur:**
```typescript
export interface CoursesBlockData {
  maxCourses?: number;              // Max. Anzahl Kurse (Standard: 3)
  maxTopics?: number;                // Max. Anzahl Themenstunden (Standard: 3)
  showEmptyMessage?: boolean;        // Leere-Meldung anzeigen (Standard: true)
  backgroundImage?: MediaRef;        // Hintergrundbild (optional)
  backgroundImageOpacity?: number;   // Transparenz 0-100 (Standard: 75)
  title?: string;                    // Überschrift (Standard: "Entdecke die Welt der Babyzeichen")
  subtitle?: string;                 // Untertitel (Standard: "In unserer Master-Übersicht...")
}
```

**Implementierung:**
- **Server Component:** `src/components/courses/courses-block.tsx`
- **Block Registry:** `src/lib/page-builder/registry.tsx`
- **Page Renderer:** Integriert in `page-renderer-server.tsx` und `page-renderer.tsx`

### 23.4 Migration von statischem HTML zu Courses Block

**Schritt-für-Schritt Anleitung:**

#### Schritt 1: Rich-Text Block entfernen
1. Page Builder öffnen
2. Rich-Text Block mit statischen Terminen finden
3. Block löschen (🗑️ Button)

#### Schritt 2: Courses Block hinzufügen
1. "Block hinzufügen" klicken
2. "Kurse & Termine" auswählen
3. Block wird automatisch eingefügt

#### Schritt 3: Konfiguration anpassen
1. Block in der Liste auswählen
2. Inspector öffnet sich rechts
3. Einstellungen anpassen:
   - **Max. Kurse:** Anzahl der anzuzeigenden mehrwöchigen Kurse (Standard: 3)
   - **Max. Themenstunden:** Anzahl der anzuzeigenden Einzeltermine (Standard: 3)
   - **Hintergrundbild:** Optionales Bild aus Media-Bibliothek wählen
   - **Transparenz:** 0-100% (Standard: 75%)
   - **Titel:** Überschrift anpassen (Standard: "Entdecke die Welt der Babyzeichen")
   - **Untertitel:** Beschreibung anpassen
   - **Leere-Meldung anzeigen:** Checkbox für "Keine Kurse verfügbar" Meldung

#### Schritt 4: Speichern und prüfen
1. "Speichern" klicken
2. Öffentliche Seite öffnen
3. Termine werden automatisch aus der Datenbank geladen

### 23.5 Funktionsweise des Courses Blocks

**Datenbank-Abfrage:**
```typescript
const courses = await db.course.findMany({
  where: {
    status: "PUBLISHED",
  },
  include: {
    sessions: {
      orderBy: {
        startAt: "asc",
      },
    },
    _count: {
      select: {
        bookings: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
        },
      },
    },
  },
});
```

**Filterung:**
- Nur veröffentlichte Kurse (`status: "PUBLISHED"`)
- Kurse mit mindestens einer Session ODER geplantem Monat/Jahr
- Chronologische Sortierung nach Datum

**Kategorisierung:**
- **Babyzeichenkurse (Mehrwöchig):**
  - `category === "COURSE"` ODER
  - `category === "AUTO"` mit mehreren Sessions ODER
  - Geplantes Datum (Monat/Jahr) ohne Sessions
- **Themenstunden (Einzeltermine):**
  - `category === "TOPIC"` ODER
  - `category === "AUTO"` mit genau einer Session

**Anzeige:**
- Datum: Genaues Datum (Format: "DD.MM.YY") oder geplantes Datum ("ab Monat Jahr")
- Uhrzeit: Zeitbereich für mehrwöchige Kurse, einzelne Zeit für Themenstunden
- Verfügbarkeit: "Anfängerkurs"/"Spezial" oder "Ausgebucht"
- Link: Automatischer Link zu `/kurse/[id]`

### 23.6 Custom Styling

**Hinweis:** Der Courses Block verwendet ein vorgefertigtes CSS-Layout, das dem statischen HTML-Code ähnelt.

**Styling-Features:**
- Glassmorphism-Effekte (Frosted Glass)
- Responsive Design (Mobile/Desktop)
- Anpassbare Hintergrundbilder mit Transparenz
- Konsistente Farben und Typografie

**Farben:**
- Brand-Farbe: `#c0363b` (konfigurierbar via CSS-Variable `--brand`)
- Text-Farbe: `#111827`
- Muted-Farbe: `#6b7280`

### 23.7 Alternative: Current Appointments Block

**Für einfachere Termin-Listen:**

Der `currentAppointments` Block zeigt eine kompakte Liste aktueller Termine:

**Datenstruktur:**
```typescript
export interface CurrentAppointmentsBlockData {
  title?: string;                    // Überschrift (Standard: "Aktuelle Termine")
  courseTypes?: CourseCategory[];    // Kursarten: ["COURSE", "TOPIC", "AUTO"]
  maxItems?: number;                 // Max. Anzahl (Standard: 10)
  showEmptyMessage?: boolean;        // Leere-Meldung anzeigen
}
```

**Verwendung:**
1. "Block hinzufügen" → "Aktuelle Termine"
2. Kursarten auswählen (Babyzeichenkurse, Themenstunden, Auto)
3. Max. Anzahl konfigurieren
4. Speichern

### 23.8 Best Practices

**1. Verwende Courses Block für Haupt-Übersicht:**
- Vollständiges Layout mit Hintergrundbild
- Zwei Spalten (Kurse + Themenstunden)
- CTA-Bereich für Kontakt

**2. Verwende Current Appointments Block für kompakte Listen:**
- Einfache Liste ohne Hintergrundbild
- Filterbar nach Kursart
- Ideal für Sidebar oder Footer

**3. Kombiniere beide Blöcke:**
- Courses Block oben für Haupt-Übersicht
- Current Appointments Block unten für detaillierte Liste

**4. Vermeide statisches HTML:**
- ❌ Keine fest codierten Termine in Rich-Text Blöcken
- ✅ Immer dynamische Blöcke verwenden
- ✅ Nur für statische Inhalte (Texte, Bilder) Rich-Text verwenden

### 23.9 Troubleshooting

**Problem: Keine Kurse werden angezeigt**

**Lösung:**
1. Prüfe ob Kurse in der Datenbank existieren
2. Prüfe ob Kurse `status: "PUBLISHED"` haben
3. Prüfe ob Kurse Sessions haben oder geplantes Datum
4. Prüfe `maxCourses` und `maxTopics` Einstellungen

**Problem: Falsche Kategorisierung**

**Lösung:**
1. Prüfe `category` Feld im Kurs (COURSE, TOPIC, AUTO)
2. Bei AUTO: Prüfe Anzahl der Sessions
3. Manuell `category` im Admin-Bereich setzen

**Problem: Hintergrundbild wird nicht angezeigt**

**Lösung:**
1. Prüfe ob Bild in Media-Bibliothek hochgeladen wurde
2. Prüfe `backgroundImage.url` im Block-Data
3. Prüfe `backgroundImageOpacity` (0-100)

### 23.10 Projekt-Struktur

```
src/
├── components/
│   └── courses/
│       ├── courses-block.tsx              # Courses Block Server Component
│       └── current-appointments-block.tsx # Current Appointments Block
├── lib/
│   └── page-builder/
│       ├── types.ts                       # CoursesBlockData, CurrentAppointmentsBlockData
│       └── registry.tsx                  # Block-Typen registriert
└── app/
    └── [slug]/
        └── page.tsx                       # Unterstützt courses Block
```

### 23.11 Zusammenfassung

**Vorteile der dynamischen Integration:**
✅ Automatische Synchronisation mit Kalender
✅ Keine manuelle Aktualisierung nötig
✅ Filterung und Sortierung automatisch
✅ Unterstützung für geplante Termine
✅ Verfügbarkeits-Anzeige
✅ Konsistentes Styling
✅ Responsive Design

**Empfehlung:**
- **Immer** `courses` Block verwenden statt statischem HTML
- Nur für statische Inhalte Rich-Text Block verwenden
- Kombiniere `courses` und `currentAppointments` für verschiedene Ansichten

---

## Schritt 24: Page Template System

### 24.1 Übersicht

**Ziel:** Implementierung eines flexiblen Template-Systems, das es ermöglicht, HTML-Templates für Header, Body und Footer zu erstellen und Seiten zuzuweisen. Templates unterstützen Platzhalter, dynamische Navigation, Top-Bar und benutzerdefiniertes CSS.

**Features:**
- HTML-Templates für Header, Body und Footer
- Platzhalter-System (`{{title}}`, `{{content}}`, etc.)
- Dynamische Navigation-Integration
- Top-Bar Integration (obere Kontaktleiste)
- Logo-Ersetzung
- Benutzerdefiniertes CSS pro Template
- Template-Zuweisung zu Seiten
- Cache-Invalidierung bei Template-Änderungen

### 24.2 Datenmodell

**Prisma Schema (`prisma/schema.prisma`):**

```prisma
model PageTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  headerHtml  String   @default("")
  bodyHtml    String   @default("")
  footerHtml  String   @default("")
  customCss   String?  @default("")
  isActive    Boolean  @default(true)
  pages       Page[]
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}

model Page {
  // ... bestehende Felder ...
  templateId  String?
  template    PageTemplate? @relation(fields: [templateId], references: [id])
}
```

**Felder:**
- **`headerHtml`**: HTML-Code für den Header-Bereich (kann Platzhalter enthalten)
- **`bodyHtml`**: HTML-Code für den Body-Bereich (muss `{{content}}` Platzhalter enthalten)
- **`footerHtml`**: HTML-Code für den Footer-Bereich (optional)
- **`customCss`**: Benutzerdefiniertes CSS, das nur für Seiten mit diesem Template geladen wird
- **`isActive`**: Aktivierungsstatus (nur aktive Templates werden verwendet)
- **`templateId`** (Page): Verknüpfung zu einem PageTemplate

### 24.3 Platzhalter-System

**Unterstützte Platzhalter:**

1. **`{{title}}`**: Wird durch den Seitentitel ersetzt (kann auch durch Logo ersetzt werden)
2. **`{{content}}`**: Wird durch den Seiteninhalt (PageRenderer) ersetzt
3. **`{{siteName}}`**: Wird durch den Site-Namen aus Settings ersetzt
4. **`{{siteUrl}}`**: Wird durch die Site-URL ersetzt
5. **`<!-- Navigation Items werden hier dynamisch eingefügt -->`**: Wird durch dynamische Navigation ersetzt
6. **`<!-- Top Contact Bar -->`**: Wird durch die Top-Bar ersetzt

**Implementierung: `src/lib/page-templates/renderer.ts`**

```typescript
export function replacePlaceholders(
  html: string,
  data: TemplateRenderData
): string {
  let result = html;
  result = result.replace(/\{\{title\}\}/g, data.title || "");
  result = result.replace(/\{\{siteName\}\}/g, data.siteName || "");
  result = result.replace(/\{\{siteUrl\}\}/g, data.siteUrl || "");
  // ... weitere Platzhalter
  return result;
}
```

### 24.4 Template-Rendering

**Komponente: `src/components/page-templates/template-content-wrapper.tsx`**

**Funktionalität:**
1. Lädt Website-Einstellungen (Settings)
2. Lädt Top-Bar-Konfiguration
3. Lädt Navigation-Items (Header)
4. Ersetzt Platzhalter im Header-HTML
5. Ersetzt Logo/Titel (`{{title}}` → Logo oder Site-Name)
6. Ersetzt Navigation-Placeholder durch dynamische Navigation
7. Ersetzt Top-Bar-Placeholder durch dynamische Top-Bar
8. Rendert Body-HTML mit `{{content}}` Platzhalter
9. Fügt benutzerdefiniertes CSS hinzu (falls vorhanden)

**Wichtige Features:**

**Logo-Ersetzung:**
- Wenn `header_logo_url` in Settings vorhanden ist, wird `<span>{{title}}</span>` durch `<img>` ersetzt
- Sonst wird `{{title}}` durch `site_name` ersetzt

**Navigation-Integration:**
- Navigation-Items werden dynamisch aus der Datenbank geladen
- Unterstützt verschachtelte Menüs (Submenus)
- CSS-Klassen werden automatisch angewendet
- Hover-Verhalten für Dropdown-Menüs

**Top-Bar-Integration:**
- Top-Bar wird aus `top_bar_config` Settings geladen
- Dynamische Hintergrundfarbe, Textfarbe und Höhe
- Items werden als HTML generiert

**Body-Rendering:**
- `bodyHtml` wird am `{{content}}` Platzhalter geteilt
- `bodyBefore` wird vor dem Seiteninhalt gerendert
- `bodyAfter` wird nach dem Seiteninhalt gerendert
- Seiteninhalt wird als React-Komponente eingefügt (vermeidet Hydration-Fehler)

### 24.5 Admin-Interface

**Route: `/admin/page-templates`**

**Komponente: `src/components/admin/page-templates-form.tsx`**

**Features:**
- Liste aller Templates
- Erstellen neuer Templates
- Bearbeiten bestehender Templates
- Aktivieren/Deaktivieren von Templates
- Vorschau des Template-HTML
- Textarea-Felder für:
  - Header HTML
  - Body HTML
  - Footer HTML
  - Benutzerdefiniertes CSS
- Template-Details anzeigen

**Template-Formular:**
- Name (eindeutig, erforderlich)
- Beschreibung (optional)
- Header HTML (Textarea)
- Body HTML (Textarea, sollte `{{content}}` enthalten)
- Footer HTML (Textarea, optional)
- Benutzerdefiniertes CSS (Textarea, optional)
- Aktiv (Checkbox)

### 24.6 API-Routen

**GET `/api/admin/page-templates`**
- Gibt alle Templates zurück
- Auth erforderlich (ADMIN/EDITOR)

**POST `/api/admin/page-templates`**
- Erstellt neues Template
- Validiert Daten mit Zod
- Prüft Name-Eindeutigkeit
- Invalidiert Cache nach Erstellung

**GET `/api/admin/page-templates/[id]`**
- Gibt einzelnes Template zurück
- Auth erforderlich

**PUT `/api/admin/page-templates/[id]`**
- Aktualisiert Template
- Validiert Daten
- **Cache-Invalidierung:**
  - Findet alle Seiten, die dieses Template verwenden
  - Invalidiert Cache für jede Seite (`revalidatePath`, `revalidateTag`)
  - Invalidiert allgemeinen Pages-Cache
  - Invalidiert Template-Cache
  - Wartet 200ms für Verarbeitung

**DELETE `/api/admin/page-templates/[id]`**
- Löscht Template
- Prüft ob Template von Seiten verwendet wird
- Invalidiert Cache

### 24.7 Seiten-Integration

**Route: `src/app/[slug]/page.tsx`**

**Template-Loading:**
```typescript
// Template IMMER frisch laden (nicht gecacht)
template = await db.pageTemplate.findUnique({
  where: { id: templateId },
});

// Nur aktive Templates verwenden
if (template && template.isActive) {
  return (
    <TemplateContentWrapper template={template} page={page}>
      {pageContent}
    </TemplateContentWrapper>
  );
}
```

**Cache-Konfiguration:**
```typescript
export const dynamic = "force-dynamic";
export const revalidate = 0; // Kein Caching für Seiten mit Templates
```

**Wichtig:** Seiten werden immer frisch geladen, damit Template-Änderungen sofort sichtbar sind.

### 24.8 CSS-Integration

**Benutzerdefiniertes CSS:**
- Wird in einem `<style>` Tag im `<head>` oder am Anfang des Templates gerendert
- Gilt nur für Seiten, die dieses Template verwenden
- Wird mit `dangerouslySetInnerHTML` und `suppressHydrationWarning` gerendert

**Beispiel:**
```css
/* Template-spezifisches CSS */
.meine-klasse {
  color: red;
  font-size: 18px;
}
```

### 24.9 Cache-Invalidierung

**Strategie:**
1. **Bei Template-Update:**
   - Alle Seiten, die dieses Template verwenden, werden identifiziert
   - Für jede Seite: `revalidatePath` (page + layout)
   - `revalidateTag` für Seiten-Cache
   - `revalidateTag` für Template-Cache
   - Wartezeit: 200ms

2. **Bei Template-Erstellung:**
   - Template-Cache wird invalidiert
   - Allgemeiner Pages-Cache wird invalidiert

3. **Seiten-Rendering:**
   - Templates werden immer frisch geladen (kein Caching)
   - `dynamic = "force-dynamic"` und `revalidate = 0`

### 24.10 Template-Beispiel

**Header HTML:**
```html
<header class="bg-white shadow">
  <div class="container mx-auto px-4">
    <nav class="flex items-center justify-between">
      <a href="/">
        <span>{{title}}</span>
      </a>
      <!-- Navigation Items werden hier dynamisch eingefügt -->
    </nav>
  </div>
</header>
```

**Body HTML:**
```html
<div class="container mx-auto px-4 py-8">
  <article>
    {{content}}
  </article>
</div>
```

**Footer HTML:**
```html
<footer class="bg-gray-800 text-white">
  <div class="container mx-auto px-4 py-8">
    <p>&copy; {{siteName}} {{year}}</p>
  </div>
</footer>
```

**Custom CSS:**
```css
/* Template-spezifische Styles */
header nav a {
  transition: color 0.3s;
}

header nav a:hover {
  color: #3b82f6;
}
```

### 24.11 Projekt-Struktur

```
src/
├── components/
│   ├── page-templates/
│   │   └── template-content-wrapper.tsx  # Template-Rendering
│   └── admin/
│       └── page-templates-form.tsx        # Admin-UI
├── lib/
│   └── page-templates/
│       └── renderer.ts                    # Platzhalter-Ersetzung
└── app/
    ├── [slug]/
    │   └── page.tsx                        # Template-Integration
    └── api/
        └── admin/
            └── page-templates/
                ├── route.ts                # GET, POST
                └── [id]/
                    └── route.ts            # GET, PUT, DELETE
```

### 24.12 Troubleshooting

**Problem: Template-Änderungen werden nicht angezeigt**

**Lösungen:**
1. **Browser-Cache leeren:**
   - Hard Refresh: `Ctrl+Shift+R` (Windows/Linux) oder `Cmd+Shift+R` (Mac)
   - DevTools → Network → "Disable cache" aktivieren

2. **Server neu starten:**
   - Im Dev-Mode: Server stoppen und neu starten

3. **Cache-Invalidierung prüfen:**
   - Server-Konsole auf Logs prüfen: `[PageTemplate] ✅✅✅ Cache vollständig invalidiert`
   - Falls nicht vorhanden, manuell invalidieren

4. **Template-Status prüfen:**
   - Template muss `isActive: true` haben
   - Seite muss `templateId` zugewiesen haben

5. **Debug-Logs aktivieren:**
   - Server-Konsole zeigt Template-Loading-Details
   - Prüfe: `[SlugPage] Template geladen` mit allen Details

**Problem: Hydration-Fehler**

**Lösung:**
- Stelle sicher, dass `bodyBefore` und `bodyAfter` keine ungeschlossenen HTML-Tags enthalten
- Verwende React-Komponenten für Container-Struktur
- Verwende `suppressHydrationWarning` für dynamisch generiertes HTML

**Problem: Navigation wird nicht angezeigt**

**Lösung:**
- Stelle sicher, dass `<!-- Navigation Items werden hier dynamisch eingefügt -->` im Header-HTML vorhanden ist
- Prüfe, ob Navigation-Items in der Datenbank existieren (`location: "HEADER"`)

**Problem: Logo wird nicht angezeigt**

**Lösung:**
- Prüfe `header_logo_url` in Settings
- Stelle sicher, dass `{{title}}` im Header-HTML vorhanden ist
- Logo-Ersetzung erfolgt vor Platzhalter-Ersetzung

### 24.13 Zusammenfassung

**Vorteile des Template-Systems:**
✅ Flexible HTML-Templates für Header, Body, Footer
✅ Platzhalter-System für dynamische Inhalte
✅ Benutzerdefiniertes CSS pro Template
✅ Dynamische Navigation-Integration
✅ Top-Bar-Integration
✅ Logo-Ersetzung
✅ Cache-Invalidierung bei Änderungen
✅ Template-Aktivierung/Deaktivierung
✅ Einfache Zuweisung zu Seiten

**Best Practices:**
- Verwende `{{content}}` Platzhalter im Body-HTML
- Stelle sicher, dass Templates aktiv sind (`isActive: true`)
- Teste Template-Änderungen im Dev-Mode
- Verwende Hard Refresh nach Template-Änderungen
- Dokumentiere benutzerdefinierte CSS-Klassen

---

*Erstellt am: 2025-12-14*  
*Version: 5.4 - Page Template System dokumentiert*

