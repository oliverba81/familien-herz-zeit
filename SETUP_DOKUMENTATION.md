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

*Erstellt am: 2025-12-14*  
*Version: 3.0 - Page Builder Light hinzugefügt*

