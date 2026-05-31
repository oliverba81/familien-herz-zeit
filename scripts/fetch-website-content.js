/**
 * Script zum Abrufen von Website-Inhalten
 * Führt manuell aus: node scripts/fetch-website-content.js
 */

const pages = [
  { slug: "", title: "Startseite", url: "https://www.familien-herz-zeit.de/" },
  { slug: "babyzeichensprachekurs", title: "Babyzeichensprachekurs", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/eltern-kind-kurse/babyzeichensprachekurs" },
  { slug: "themenstunden", title: "Themenstunden", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/eltern-kind-kurse/themenstunden" },
  { slug: "elternkurse", title: "Elternkurse", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/elternkurse" },
  { slug: "workshops-eltern", title: "Workshops für Eltern", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/workshops" },
  { slug: "elternberatung", title: "Elternberatung", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-eltern/elternberatung" },
  { slug: "weiterbildungen", title: "Weiterbildungen", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/weiterbildungen" },
  { slug: "workshops-fachpersonal", title: "Workshops für Fachpersonal", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/workshops" },
  { slug: "themenstunden-fachpersonal", title: "Themenstunden für Fachpersonal", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/themenstunden" },
  { slug: "elternabende", title: "Elternabende", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/fuer-fachpersonal/elternabende" },
  { slug: "vortraege-und-seminare", title: "Vorträge und Seminare", url: "https://www.familien-herz-zeit.de/herz-zeit-angebote/vortraege-und-seminare" },
  { slug: "babyzeichensprache/was-ist-das", title: "Was ist das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/was-ist-das" },
  { slug: "babyzeichensprache/wie-funktioniert-das", title: "Wie funktioniert das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/wie-funktioniert-das" },
  { slug: "babyzeichensprache/ab-welchem-alter", title: "Ab welchem Alter?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/ab-welchem-alter" },
  { slug: "ueber-mich/persoenlich", title: "Persönlich", url: "https://www.familien-herz-zeit.de/ueber-mich/persoenlich" },
  { slug: "ueber-mich/beruflich", title: "Beruflich", url: "https://www.familien-herz-zeit.de/ueber-mich/beruflich" },
  { slug: "kontakt", title: "Kontakt", url: "https://www.familien-herz-zeit.de/kontakt" },
];

console.log("Zu importierende Seiten:");
pages.forEach((page, idx) => {
  console.log(`${idx + 1}. ${page.title} (${page.slug || "/"})`);
  console.log(`   URL: ${page.url}`);
});

console.log("\nHinweis: Die Inhalte müssen manuell im Admin-Bereich erstellt werden.");
console.log("Verwenden Sie den Page Builder unter /admin/pages");

