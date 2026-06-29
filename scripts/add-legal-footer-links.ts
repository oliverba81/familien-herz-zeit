/**
 * Ergänzungsskript: Fügt fehlende rechtliche Links (AGB & Widerrufsbelehrung)
 * zur Footer-Navigation hinzu, ohne bestehende Navigation zu löschen.
 *
 * Idempotent: Bereits vorhandene Links (gleicher href im Footer) werden übersprungen.
 *
 * Führe aus mit: npx tsx scripts/add-legal-footer-links.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const legalLinks = [
  { href: "/agb", label: "AGB" },
  { href: "/widerrufsbelehrung", label: "Widerrufsbelehrung" },
];

async function run() {
  console.log("Ergänze fehlende rechtliche Footer-Links...");

  // Top-Level Footer-Items (parentId = null), nach denen die neuen Links angehängt werden
  const existing = await prisma.navigationItem.findMany({
    where: { location: "FOOTER", parentId: null },
    orderBy: { order: "asc" },
  });

  let nextOrder = existing.reduce((max, item) => Math.max(max, item.order), -1) + 1;

  for (const link of legalLinks) {
    const alreadyPresent = existing.some((item) => item.href === link.href);
    if (alreadyPresent) {
      console.log(`• "${link.label}" (${link.href}) ist bereits vorhanden – übersprungen`);
      continue;
    }

    await prisma.navigationItem.create({
      data: {
        location: "FOOTER",
        label: link.label,
        href: link.href,
        order: nextOrder,
        parentId: null,
      },
    });
    console.log(`✓ "${link.label}" (${link.href}) hinzugefügt (order ${nextOrder})`);
    nextOrder++;
  }

  console.log("Fertig.");
}

run()
  .catch((e) => {
    console.error("Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
