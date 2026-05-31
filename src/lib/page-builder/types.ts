export type BlockType =
  | "hero"
  | "text"
  | "richText"
  | "image"
  | "video"
  | "features"
  | "testimonials"
  | "cta"
  | "spacer"
  | "table"
  | "section"
  | "reusable"
  | "courses"
  | "current-appointments"
  | "herzzeit-story"
  | "contactForm";

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, any>;
}

export interface PageContent {
  version: number;
  blocks: Block[];
}

// Block-spezifische Data-Typen (für Type-Safety)
export interface HeroBlockData {
  heading: string;
  subheading?: string;
  align?: "left" | "center" | "right";
}

export interface TextBlockData {
  text: string;
}

export interface RichTextBlockData {
  html: string;
  fontSize?: string; // Schriftgröße, z.B. "sm", "md", "lg", "xl", "2xl", "3xl" oder "custom"
  customFontSize?: string; // Benutzerdefinierte Schriftgröße, z.B. "18px" oder "1.2rem"
}

/**
 * Media Reference - einheitliches Schema für Media in Blocks
 */
export interface MediaRef {
  mediaId?: string;  // ID aus Media Table
  url?: string;      // Fallback / Legacy URL
  alt?: string;      // Alt-Text (für Images)
  caption?: string;  // Bildunterschrift (optional)
}

export interface ImageBlockData {
  media?: MediaRef;  // Neue Struktur
  src?: string;      // Legacy - wird migriert
  alt?: string;      // Legacy - wird migriert
  caption?: string;  // Legacy - wird migriert
  rounded?: "none" | "sm" | "md" | "lg" | "full"; // Rundung der Ecken
  aspect?: "auto" | "16:9" | "4:3" | "1:1";
  size?: number;     // Größe in Prozent (100 = Originalgröße, Standard: 100)
  borderStyle?: "none" | "glass" | "glow" | "gradient" | "soft" | "minimal" | "floating" | "custom";
  customBorderStyle?: string; // Für benutzerdefinierte CSS-Klassen
  borderPadding?: string; // Abstand zwischen Rahmen und Bild (z.B. "8px", "16px", "24px")
  borderWidth?: string; // Rahmenbreite (z.B. "1px", "2px", "4px")
  fullWidth?: boolean; // Bild auf volle Breite strecken
  fixedHeight?: string; // Feste Bildhöhe (z.B. "300px" oder "50vh")
}

export interface VideoBlockData {
  media?: MediaRef;  // Neue Struktur
  src?: string;      // Legacy - wird migriert
  title?: string;
  poster?: MediaRef; // Optional: Poster Image
}

export interface FeatureItem {
  title: string;
  text: string;
}

export interface FeaturesBlockData {
  items: FeatureItem[];
}

export interface TestimonialItem {
  name: string;
  text: string;
}

export interface TestimonialsBlockData {
  items: TestimonialItem[];
}

export interface CTABlockData {
  heading: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface SpacerBlockData {
  size: "sm" | "md" | "lg" | "xl";
}

export interface TableCell {
  blocks: Block[];
  borderStyle?: "none" | "glass" | "glow" | "gradient" | "soft" | "minimal" | "floating" | "custom";
  customBorderStyle?: string; // Für benutzerdefinierte CSS-Klassen
  backgroundColor?: string; // Optional: Hintergrundfarbe (z.B. "#ffffff" oder "bg-white")
}export interface TableRow {
  cells: TableCell[];
}export interface TableBlockData {
  rows: TableRow[];
  columnWidths?: string[]; // Array von Breiten wie "200px" oder "50%"
  rowSpacing?: string; // Abstand zwischen Zeilen, z.B. "sm", "md", "lg", "xl" oder "custom"
  customRowSpacing?: string; // Benutzerdefinierter Abstand, z.B. "12px" oder "1rem"
  columnSpacing?: string; // Abstand zwischen Spalten, z.B. "sm", "md", "lg", "xl" oder "custom"
  customColumnSpacing?: string; // Benutzerdefinierter Abstand, z.B. "12px" oder "1rem"
  cellPadding?: string; // Padding in Zellen, z.B. "sm", "md", "lg", "xl" oder "custom"
  customCellPadding?: string; // Benutzerdefiniertes Padding, z.B. "12px" oder "1rem"
}export interface SectionBlockData {
  title?: string;
  layout?: "default" | "narrow";
  background?: "none" | "soft";
  padding?: "sm" | "md" | "lg";
  children: Block[]; // Nested blocks
}export interface ReusableBlockData {
  reusableId: string;
}export interface CoursesBlockData {
  maxCourses?: number; // Max. Anzahl Kurse (Standard: 3)
  maxTopics?: number; // Max. Anzahl Themenstunden (Standard: 3)
  showEmptyMessage?: boolean; // Zeige Meldung wenn keine Kurse
  backgroundImage?: MediaRef; // Optional: Hintergrundbild für den Block
  backgroundImageOpacity?: number; // Transparenz des Overlays (0-100, Standard: 75)
  title?: string; // Titel für den Hero-Bereich
  subtitle?: string; // Untertitel für den Hero-Bereich
  contactLinkUrl?: string; // Link zum Kontakt (z. B. #kontakt oder /kontakt)
  contactLinkLabel?: string; // Beschriftung des Kontakt-Links (z. B. "Jetzt Kontakt aufnehmen")
}export interface CurrentAppointmentsBlockData {
  title?: string; // Überschrift (Standard: "Aktuelle Termine")
  showCourses?: boolean; // Babyzeichenkurse anzeigen (Standard: true)
  showTopics?: boolean; // Themenstunden anzeigen (Standard: true)
  maxItems?: number; // Max. Anzahl anzuzeigender Termine (Standard: 10)
  showEmptyMessage?: boolean; // Zeige Meldung wenn keine Termine
  width?: string; // Breite: "full", "narrow", "medium" oder benutzerdefiniert (z.B. "800px", "90%")
  footerHtml?: string; // HTML-Hinweis unter den Terminen
}

export interface HerzZeitStory {
  id: string; // Eindeutige ID für die Geschichte
  title: string; // Titel der Geschichte (z.B. "Der Pfeifton & der Vogel")
  teaser: string; // 1-2 Zeilen Teaser-Text
  readingTime?: string; // Lesezeit (z.B. "2 min lesen")
  audioUrl?: string; // URL zum Audio-File
  imageUrl?: string; // URL zum Bild
  fullText: string; // Vollständiger Text der Geschichte (HTML-formatierter Text)
}

export interface HerzZeitStoryBlockData {
  title?: string; // Optionale Überschrift für den Block (HTML-formatierter Text)
  stories: HerzZeitStory[]; // Array von Geschichten
  style?: "card" | "banner" | "minimal"; // Stil der Kachel (Standard: "card") - gilt für alle Geschichten
  backgroundColor?: string; // Hintergrundfarbe (optional) - gilt für alle Geschichten
}export interface ContactFormBlockData {
  // Kontaktdaten (linke Spalte)
  name?: string; // Name der Person (z.B. "ULRIKE BARTHEL")
  role?: string; // Rolle/Titel (z.B. "HEILPÄDAGOGIN & BABYKURSTRAINERIN")
  address?: string; // Adresse (mehrzeilig)
  phone?: string; // Telefonnummer
  phoneLink?: string; // Tel-Link (z.B. "tel:+491748372463")
  email?: string; // E-Mail-Adresse
  emailLink?: string; // Mail-Link (z.B. "mailto:info@familien-herz-zeit.de")
  
  // Sprechzeiten
  showOfficeHours?: boolean; // Sprechzeiten anzeigen
  officeHoursTitle?: string; // Titel für Sprechzeiten (z.B. "SPRECHZEITEN")
  officeHoursText?: string; // Text für Sprechzeiten
  
  // Formular-Felder
  showFirstName?: boolean; // Vorname-Feld anzeigen
  firstNameLabel?: string; // Label für Vorname
  firstNameRequired?: boolean; // Vorname erforderlich
  showLastName?: boolean; // Nachname-Feld anzeigen
  lastNameLabel?: string; // Label für Nachname
  lastNameRequired?: boolean; // Nachname erforderlich
  emailLabel?: string; // Label für E-Mail
  emailRequired?: boolean; // E-Mail erforderlich
  messageLabel?: string; // Label für Nachricht
  messageRequired?: boolean; // Nachricht erforderlich
  submitButtonText?: string; // Text für Submit-Button
  
  // reCAPTCHA
  enableRecaptcha?: boolean; // reCAPTCHA aktivieren
  recaptchaSiteKey?: string; // reCAPTCHA Site Key (optional, kann auch aus ENV kommen)
  
  // Layout
  layout?: "default" | "stacked"; // Layout-Variante
}