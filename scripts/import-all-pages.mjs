/**
 * Script zum automatischen Importieren aller Seiten von familien-herz-zeit.de
 * 
 * Führt aus: node scripts/import-all-pages.mjs
 * 
 * Voraussetzung: .env muss APP_BASE_URL enthalten (z.B. http://localhost:3000)
 *                und ein Admin-User muss existieren (für Auth)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env
const envPath = join(__dirname, '..', '.env');
let env = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.error('Fehler beim Laden der .env Datei:', e.message);
  process.exit(1);
}

const BASE_URL = env.APP_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD muss in .env gesetzt sein');
  process.exit(1);
}

// Alle zu importierenden Seiten
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
  { slug: "kursanmeldung-babyzeichensprache", title: "Anmeldung Babyzeichensprachekurs", url: "https://www.familien-herz-zeit.de/kursanmeldung/kursanmeldung-babyzeichensprache" },
  { slug: "kursanmeldung-themenstunden", title: "Anmeldung Themenstunden", url: "https://www.familien-herz-zeit.de/kursanmeldung/kursanmeldung-themenstunden" },
  { slug: "babyzeichensprache/was-ist-das", title: "Was ist das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/was-ist-das" },
  { slug: "babyzeichensprache/wie-funktioniert-das", title: "Wie funktioniert das?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/wie-funktioniert-das" },
  { slug: "babyzeichensprache/ab-welchem-alter", title: "Ab welchem Alter?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/ab-welchem-alter" },
  { slug: "babyzeichensprache/fuer-wen-geeignet", title: "Für wen geeignet?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/fuer-wen-geeignet" },
  { slug: "babyzeichensprache/auch-fuer-groessere-kinder", title: "Auch für größere Kinder?", url: "https://www.familien-herz-zeit.de/babyzeichensprache/auch-fuer-groessere-kinder" },
  { slug: "babyzeichensprache/hintergruende", title: "Hintergründe", url: "https://www.familien-herz-zeit.de/babyzeichensprache/hintergruende" },
  { slug: "babyzeichensprache/wissenschaft", title: "Wissenschaft", url: "https://www.familien-herz-zeit.de/babyzeichensprache/wissenschaft" },
  { slug: "babyzeichensprache/babyzeichen-kindermund", title: "Babyzeichen-Kindermund", url: "https://www.familien-herz-zeit.de/babyzeichensprache/babyzeichen-kindermund" },
  { slug: "babyzeichensprache/haeufige-fragen", title: "Häufige Fragen", url: "https://www.familien-herz-zeit.de/babyzeichensprache/haeufige-fragen-in-der-praxis" },
  { slug: "ueber-mich/persoenlich", title: "Persönlich", url: "https://www.familien-herz-zeit.de/ueber-mich/persoenlich" },
  { slug: "ueber-mich/beruflich", title: "Beruflich", url: "https://www.familien-herz-zeit.de/ueber-mich/beruflich" },
  { slug: "ueber-mich/ehrenamtlich", title: "Ehrenamtlich", url: "https://www.familien-herz-zeit.de/ueber-mich/ehrenamtlich" },
  { slug: "kontakt", title: "Kontakt", url: "https://www.familien-herz-zeit.de/kontakt" },
  { slug: "impressum", title: "Impressum", url: "https://www.familien-herz-zeit.de/impressum" },
  { slug: "datenschutzerklaerung", title: "Datenschutzerklärung", url: "https://www.familien-herz-zeit.de/datenschutzerklaerung" },
];

async function login() {
  const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login fehlgeschlagen: ${response.status}`);
  }

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function fetchPageContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Familien-Herz-Zeit-Importer/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Entferne Scripts, Styles, Nav, Footer
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    // Extrahiere Hauptinhalt
    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                     cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                     cleanHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const content = mainMatch ? mainMatch[1] : cleanHtml;

    // Extrahiere Text (vereinfacht)
    const text = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limitiere auf 10000 Zeichen

    // Extrahiere Überschriften
    const headings = [];
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h2Matches = content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
    const h3Matches = content.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi);

    if (h1Match) {
      headings.push({ level: 1, text: h1Match[1].replace(/<[^>]+>/g, '').trim() });
    }

    for (const match of h2Matches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) headings.push({ level: 2, text });
    }

    for (const match of h3Matches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) headings.push({ level: 3, text });
    }

    return { text, headings, rawHtml: content };
  } catch (error) {
    console.error(`Fehler beim Abrufen von ${url}:`, error.message);
    return null;
  }
}

async function createPage(page, cookies) {
  const content = await fetchPageContent(page.url);
  
  if (!content) {
    console.log(`⚠️  Überspringe ${page.title} (Inhalt konnte nicht abgerufen werden)`);
    return null;
  }

  // Erstelle Page Builder Content
  const blocks = [];

  // Hero Block mit Titel
  blocks.push({
    type: "hero",
    heading: page.title,
    subheading: "",
  });

  // Füge Überschriften als Hero/Text-Blöcke hinzu
  let lastHeadingLevel = 1;
  for (const heading of content.headings.slice(0, 10)) { // Max 10 Überschriften
    if (heading.level === 1 && heading.text !== page.title) {
      blocks.push({
        type: "hero",
        heading: heading.text,
        subheading: "",
      });
    } else if (heading.level === 2) {
      blocks.push({
        type: "text",
        text: `<h2>${heading.text}</h2>`,
      });
    } else if (heading.level === 3) {
      blocks.push({
        type: "text",
        text: `<h3>${heading.text}</h3>`,
      });
    }
  }

  // Text-Block mit Hauptinhalt
  if (content.text) {
    blocks.push({
      type: "text",
      text: content.text,
    });
  }

  // Spacer am Ende
  blocks.push({
    type: "spacer",
    size: "md",
  });

  const pageData = {
    title: page.title,
    slug: page.slug || "startseite",
    published: false, // Standardmäßig nicht veröffentlicht
    contentJson: { blocks },
  };

  try {
    const response = await fetch(`${BASE_URL}/api/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Fehler beim Erstellen von ${page.title}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starte Import aller Seiten...\n');

  // Login
  console.log('🔐 Login...');
  let cookies;
  try {
    cookies = await login();
    console.log('✅ Login erfolgreich\n');
  } catch (error) {
    console.error('❌ Login fehlgeschlagen:', error.message);
    console.log('\nHinweis: Bitte stellen Sie sicher, dass:');
    console.log('1. Der Server läuft (npm run dev)');
    console.log('2. ADMIN_EMAIL und ADMIN_PASSWORD in .env gesetzt sind');
    process.exit(1);
  }

  // Importiere alle Seiten
  const results = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`[${i + 1}/${pages.length}] Importiere: ${page.title}...`);
    
    const result = await createPage(page, cookies);
    if (result) {
      console.log(`✅ ${page.title} erstellt (Slug: ${page.slug || "/"})`);
      results.push({ page, success: true, result });
    } else {
      console.log(`❌ ${page.title} fehlgeschlagen`);
      results.push({ page, success: false });
    }

    // Kurze Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Zusammenfassung
  console.log('\n📊 Zusammenfassung:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Erfolgreich: ${successful}`);
  console.log(`❌ Fehlgeschlagen: ${failed}`);
  console.log(`\n💡 Tipp: Überprüfen Sie die Seiten im Admin-Bereich unter ${BASE_URL}/admin/pages`);
  console.log('   und veröffentlichen Sie sie, wenn der Inhalt korrekt ist.');
}

main().catch(console.error);

