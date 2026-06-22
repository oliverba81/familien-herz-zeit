import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Lade .env explizit
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

/**
 * Liest eine HTML-Vorlage aus dem docs-Verzeichnis und entfernt den
 * führenden HTML-Kommentarblock (Anleitung). Das Ergebnis ist das reine
 * HTML-Fragment, das der V2-Renderer ({ version: 2, html }) erwartet.
 */
function readLegalTemplate(fileName: string): string {
  const filePath = join(__dirname, "..", "docs", fileName);
  const raw = readFileSync(filePath, "utf-8");
  // Entferne HTML-Kommentare (<!-- ... -->) und trimme.
  return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/**
 * Legt die Rechtsseiten (AGB, Widerrufsbelehrung) idempotent an.
 *
 * Wichtig: `update: {}` (Insert-if-not-exists) – ein erneuter Seed-Lauf
 * überschreibt redaktionell über die Admin-UI editierte Inhalte NICHT.
 * Hinweis: Ein Standalone-Seed löst `revalidateTag` nicht aus → nach dem
 * Seed muss die App neu gestartet/neu deployed werden, damit die Seiten
 * im Cache erscheinen.
 */
async function seedLegalPages() {
  const legalPages = [
    {
      slug: "agb",
      title: "Allgemeine Geschäftsbedingungen (AGB)",
      file: "agb-vorlage.html",
    },
    {
      slug: "widerrufsbelehrung",
      title: "Widerrufsbelehrung",
      file: "widerrufsbelehrung-vorlage.html",
    },
  ];

  for (const page of legalPages) {
    const html = readLegalTemplate(page.file);
    const content = { version: 2 as const, html };

    const result = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {}, // bestehende (ggf. redaktionell editierte) Seite nicht überschreiben
      create: {
        slug: page.slug,
        title: page.title,
        published: true,
        publishedAt: new Date(),
        contentJson: content,
        publishedContentJson: content,
      },
    });

    console.log(`Legal page ensured: /${result.slug} (id: ${result.id})`);
  }
}

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

  await seedLegalPages();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

