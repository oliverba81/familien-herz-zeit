/**
 * Migrationsskript: Importiert die bestehende hardcoded Navigation in die Datenbank
 * 
 * Führe aus mit: npx tsx scripts/migrate-navigation.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface NavItem {
  label: string;
  href?: string;
  submenu?: NavItem[];
}

const headerNav: NavItem[] = [
  { href: "/", label: "Startseite" },
  {
    label: "Herz-Zeit-Angebote",
    submenu: [
      {
        label: "Für Eltern",
        submenu: [
          {
            label: "Eltern-Kind-Kurse",
            submenu: [
              { href: "/babyzeichensprachekurs", label: "Babyzeichensprachekurs" },
              { href: "/themenstunden", label: "Themenstunden" },
            ],
          },
          { href: "/elternkurse", label: "Elternkurse" },
          { href: "/workshops-eltern", label: "Workshops" },
          { href: "/elternberatung", label: "Elternberatung" },
        ],
      },
      {
        label: "Für Fachpersonal",
        submenu: [
          { href: "/weiterbildungen", label: "Weiterbildungen" },
          { href: "/workshops-fachpersonal", label: "Workshops" },
          { href: "/themenstunden-fachpersonal", label: "Themenstunden" },
          { href: "/elternabende", label: "Elternabende" },
        ],
      },
      { href: "/vortraege-und-seminare", label: "Vorträge und Seminare" },
    ],
  },
  {
    label: "Kursanmeldung",
    submenu: [
      { href: "/kursanmeldung-babyzeichensprache", label: "Anmeldung Babyzeichensprachekurs" },
      { href: "/kursanmeldung-themenstunden", label: "Anmeldung Themenstunden" },
    ],
  },
  {
    label: "Babyzeichensprache",
    submenu: [
      { href: "/babyzeichensprache/was-ist-das", label: "Was ist das?" },
      { href: "/babyzeichensprache/wie-funktioniert-das", label: "Wie funktioniert das?" },
      { href: "/babyzeichensprache/ab-welchem-alter", label: "Ab welchem Alter?" },
      { href: "/babyzeichensprache/fuer-wen-geeignet", label: "Für wen geeignet?" },
      { href: "/babyzeichensprache/auch-fuer-groessere-kinder", label: "Auch für größere Kinder?" },
      { href: "/babyzeichensprache/hintergruende", label: "Hintergründe" },
      { href: "/babyzeichensprache/wissenschaft", label: "Wissenschaft" },
      { href: "/babyzeichensprache/babyzeichen-kindermund", label: "Babyzeichen-Kindermund" },
      { href: "/babyzeichensprache/haeufige-fragen", label: "Häufige Fragen" },
    ],
  },
  {
    label: "Über Mich",
    submenu: [
      { href: "/ueber-mich/persoenlich", label: "Persönlich" },
      { href: "/ueber-mich/beruflich", label: "Beruflich" },
      { href: "/ueber-mich/ehrenamtlich", label: "Ehrenamtlich" },
    ],
  },
  { href: "/kontakt", label: "Kontakt" },
];

const footerNavItems: NavItem[] = [
  { href: "/", label: "Startseite" },
  { href: "/herz-zeit-angebote", label: "Herz-Zeit-Angebote" },
  { href: "/kursanmeldung", label: "Kursanmeldung" },
  { href: "/babyzeichensprache", label: "Babyzeichensprache" },
  { href: "/ueber-mich", label: "Über Mich" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutzerklaerung", label: "Datenschutzerklärung" },
  { href: "/agb", label: "AGB" },
  { href: "/widerrufsbelehrung", label: "Widerrufsbelehrung" },
];

async function createNavItem(
  item: NavItem,
  location: "HEADER" | "FOOTER",
  order: number,
  parentId?: string
): Promise<string> {
  const created = await prisma.navigationItem.create({
    data: {
      location,
      label: item.label,
      href: item.href || null,
      order,
      parentId: parentId || null,
    },
  });

  if (item.submenu && item.submenu.length > 0) {
    for (let i = 0; i < item.submenu.length; i++) {
      await createNavItem(item.submenu[i], location, i, created.id);
    }
  }

  return created.id;
}

async function migrate() {
  console.log("Starte Navigation Migration...");

  // Lösche bestehende Navigation
  await prisma.navigationItem.deleteMany({});
  console.log("Bestehende Navigation gelöscht");

  // Importiere Header Navigation
  console.log("Importiere Header Navigation...");
  for (let i = 0; i < headerNav.length; i++) {
    await createNavItem(headerNav[i], "HEADER", i);
  }
  console.log(`✓ ${headerNav.length} Header Items importiert`);

  // Importiere Footer Navigation
  console.log("Importiere Footer Navigation...");
  for (let i = 0; i < footerNavItems.length; i++) {
    await createNavItem(footerNavItems[i], "FOOTER", i);
  }
  console.log(`✓ ${footerNavItems.length} Footer Items importiert`);

  console.log("Migration abgeschlossen!");
}

migrate()
  .catch((e) => {
    console.error("Fehler bei Migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

