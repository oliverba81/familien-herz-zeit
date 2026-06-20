"use client";

import { ComponentType } from "react";
import { z } from "zod";
import { Block, BlockType } from "./types";
import { PageBlock } from "./schema";
import { createBlockId } from "./ids";
import PageRenderer from "@/components/page-renderer/page-renderer";
import BlockEditor from "@/components/page-builder/block-editor";
import { SectionCanvasComponent, SectionInspectorComponent } from "@/components/page-builder/section-block";
import { ReusableCanvasComponent, ReusableInspectorComponent } from "@/components/page-builder/reusable-block";

/**
 * Block Registry Entry
 */
export interface BlockRegistryEntry {
  type: BlockType;
  label: string;
  icon: string;
  defaultData: () => Record<string, any>;
  schema: z.ZodTypeAny; // Validation schema
  CanvasComponent: ComponentType<{ block: Block }>;
  InspectorComponent: ComponentType<{ block: Block; onChange: (block: Block) => void }>;
}

/**
 * Canvas Component Wrapper
 * Rendert einen einzelnen Block über PageRenderer
 */
function BlockCanvasWrapper({ block }: { block: Block }) {
  return (
    <PageRenderer
      content={{
        version: 1,
        blocks: [block],
      }}
    />
  );
}

/**
 * Inspector Component Wrapper
 * Nutzt existierenden BlockEditor
 */
function BlockInspectorWrapper({
  block,
  onChange,
}: {
  block: Block;
  onChange: (block: Block) => void;
}) {
  return <BlockEditor block={block} onChange={onChange} />;
}

// Block Schemas
const heroSchema = z.object({
  heading: z.string().min(1, "Überschrift ist erforderlich"),
  subheading: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  primaryCtaText: z.string().optional(),
  primaryCtaHref: z.string().optional(),
});

const textSchema = z.object({
  text: z.string(),
});

const richTextSchema = z.object({
  html: z.string(),
  fontSize: z.string().optional(),
  customFontSize: z.string().optional(),
});

const mediaRefSchema = z.object({
  mediaId: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const imageSchema = z.object({
  media: mediaRefSchema.optional(),
  src: z.string().optional(), // Legacy
  alt: z.string().optional(), // Legacy
  caption: z.string().optional(), // Legacy
  rounded: z.enum(["none", "sm", "md", "lg", "full"]).optional().default("none"),
  aspect: z.enum(["auto", "16:9", "4:3", "1:1"]).optional(),
  size: z.number().min(10).max(200).optional(), // Größe in Prozent (Standard: 100)
  borderStyle: z.enum(["none", "glass", "glow", "gradient", "soft", "minimal", "floating", "custom"]).optional(),
  customBorderStyle: z.string().optional(),
  borderPadding: z.string().optional(), // z.B. "8px", "16px", "24px"
  borderWidth: z.string().optional(), // z.B. "1px", "2px", "4px"
  fullWidth: z.boolean().optional(),
  fixedHeight: z.string().optional(), // z.B. "300px" oder "50vh"
});

const videoSchema = z.object({
  media: mediaRefSchema.optional(),
  src: z.string().optional(), // Legacy
  title: z.string().optional(),
  poster: mediaRefSchema.optional(),
});

const featureItemSchema = z.object({
  title: z.string(),
  text: z.string(),
});

const featuresSchema = z.object({
  title: z.string().optional(),
  items: z.array(featureItemSchema).min(1, "Mindestens ein Feature erforderlich"),
});

const testimonialItemSchema = z.object({
  name: z.string(),
  text: z.string(),
});

const testimonialsSchema = z.object({
  title: z.string().optional(),
  items: z.array(testimonialItemSchema).min(1, "Mindestens ein Testimonial erforderlich"),
});

const ctaSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  buttonText: z.string().optional(),
  buttonHref: z.string().optional(),
  heading: z.string().optional(), // Legacy
  buttonLabel: z.string().optional(), // Legacy
});

const spacerSchema = z.object({
  size: z.enum(["sm", "md", "lg", "xl"]),
});

const tableCellSchema = z.object({
  blocks: z.array(z.any()),
  borderStyle: z.enum(["none", "glass", "glow", "gradient", "soft", "minimal", "floating", "custom"]).optional(),
  customBorderStyle: z.string().optional(),
  backgroundColor: z.string().optional(),
});

const tableRowSchema = z.object({
  cells: z.array(tableCellSchema),
});

const tableSchema = z.object({
  rows: z.array(tableRowSchema),
  columnWidths: z.array(z.string()).optional(),
  rowSpacing: z.string().optional(),
  customRowSpacing: z.string().optional(),
  columnSpacing: z.string().optional(),
  customColumnSpacing: z.string().optional(),
  cellPadding: z.string().optional(),
  customCellPadding: z.string().optional(),
});

const sectionSchema = z.object({
  title: z.string().optional(),
  layout: z.enum(["default", "narrow"]).optional(),
  background: z.enum(["none", "soft"]).optional(),
  padding: z.enum(["sm", "md", "lg"]).optional(),
  children: z.array(z.any()), // Recursive validation handled separately
});

const reusableSchema = z.object({
  reusableId: z.string().min(1, "Reusable Block ID ist erforderlich"),
});

const coursesSchema = z.object({
  maxCourses: z.number().min(1).max(10).optional().default(3),
  maxTopics: z.number().min(1).max(10).optional().default(3),
  showEmptyMessage: z.boolean().optional().default(true),
  backgroundImage: mediaRefSchema.optional(),
  backgroundImageOpacity: z.number().min(0).max(100).optional().default(75),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  contactLinkUrl: z.string().optional(),
  contactLinkLabel: z.string().optional(),
});

const currentAppointmentsSchema = z.object({
  title: z.string().optional(),
  showCourses: z.boolean().optional().default(true),
  showTopics: z.boolean().optional().default(true),
  maxItems: z.number().min(1).max(50).optional().default(10),
  showEmptyMessage: z.boolean().optional().default(true),
  width: z.string().optional(),
  footerHtml: z.string().optional(),
});

// Schema für optionale URL-Felder: erlaubt undefined, null, leeren String oder gültige URL
// Da URL-Eingabe entfernt wurde, akzeptieren wir einfach jeden String oder leere Werte
const optionalUrlSchema = z
  .union([
    z.string(), // Akzeptiert jeden String (auch leere Strings)
    z.null(),
    z.undefined(),
  ])
  .optional();

const herzzeitStoryItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Titel ist erforderlich"),
  teaser: z.string().min(1, "Teaser ist erforderlich"),
  readingTime: z.string().optional(),
  audioUrl: optionalUrlSchema,
  imageUrl: optionalUrlSchema,
  fullText: z.string().min(1, "Volltext ist erforderlich"),
});

const herzzeitStorySchema = z.object({
  title: z.string().optional(),
  stories: z.array(herzzeitStoryItemSchema).min(1, "Mindestens eine Geschichte ist erforderlich"),
  style: z.enum(["card", "banner", "minimal"]).optional().default("card"),
  backgroundColor: z.string().optional(),
});

const contactFormSchema = z.object({
  // Kontaktdaten
  name: z.string().optional(),
  role: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  phoneLink: z.string().optional(),
  email: z.string().optional(),
  emailLink: z.string().optional(),
  
  // Sprechzeiten
  showOfficeHours: z.boolean().optional().default(true),
  officeHoursTitle: z.string().optional(),
  officeHoursText: z.string().optional(),
  
  // Formular-Felder
  showFirstName: z.boolean().optional().default(true),
  firstNameLabel: z.string().optional(),
  firstNameRequired: z.boolean().optional().default(true),
  showLastName: z.boolean().optional().default(true),
  lastNameLabel: z.string().optional(),
  lastNameRequired: z.boolean().optional().default(true),
  emailLabel: z.string().optional(),
  emailRequired: z.boolean().optional().default(true),
  messageLabel: z.string().optional(),
  messageRequired: z.boolean().optional().default(true),
  submitButtonText: z.string().optional(),
  
  // reCAPTCHA
  enableRecaptcha: z.boolean().optional().default(true),
  recaptchaSiteKey: z.string().optional(),
  
  // Layout
  layout: z.enum(["default", "stacked"]).optional().default("default"),
});

/**
 * Block Registry
 */
export const blockRegistry: Record<BlockType, BlockRegistryEntry> = {
  hero: {
    type: "hero",
    label: "Hero",
    icon: "🎯",
    schema: heroSchema,
    defaultData: () => ({
      heading: "Überschrift",
      subheading: "Untertitel",
      align: "center",
      primaryCtaText: undefined,
      primaryCtaHref: undefined,
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  text: {
    type: "text",
    label: "Text",
    icon: "📝",
    schema: textSchema,
    defaultData: () => ({
      text: "Dein Text hier...",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  richText: {
    type: "richText",
    label: "Rich Text",
    icon: "✏️",
    schema: richTextSchema,
    defaultData: () => ({
      html: "<p>Formatierter Text hier...</p>",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  image: {
    type: "image",
    label: "Bild",
    icon: "🖼️",
    schema: imageSchema,
    defaultData: () => ({
      media: undefined,
      rounded: "none" as const,
      aspect: "auto" as const,
      size: 100, // Standard: Originalgröße
      borderStyle: "none" as const,
      fullWidth: false,
      fixedHeight: undefined,
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  video: {
    type: "video",
    label: "Video",
    icon: "🎥",
    schema: videoSchema,
    defaultData: () => ({
      media: undefined,
      title: undefined,
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  features: {
    type: "features",
    label: "Features",
    icon: "⭐",
    schema: featuresSchema,
    defaultData: () => ({
      title: undefined,
      items: [
        { title: "Feature 1", text: "Beschreibung" },
        { title: "Feature 2", text: "Beschreibung" },
      ],
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    icon: "💬",
    schema: testimonialsSchema,
    defaultData: () => ({
      title: undefined,
      items: [{ name: "Name", text: "Testimonial Text" }],
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  cta: {
    type: "cta",
    label: "Call to Action",
    icon: "🚀",
    schema: ctaSchema,
    defaultData: () => ({
      title: "Call to Action",
      text: "Beschreibung",
      buttonText: "Jetzt starten",
      buttonHref: "/",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  spacer: {
    type: "spacer",
    label: "Abstand",
    icon: "↕️",
    schema: spacerSchema,
    defaultData: () => ({
      size: "md",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  table: {
    type: "table",
    label: "Tabelle",
    icon: "📊",
    schema: tableSchema,
    defaultData: () => ({
      rows: [
        {
          cells: [{ blocks: [] }, { blocks: [] }],
        },
        {
          cells: [{ blocks: [] }, { blocks: [] }],
        },
      ],
      columnWidths: ["50%", "50%"],
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  section: {
    type: "section",
    label: "Section",
    icon: "📦",
    schema: sectionSchema,
    defaultData: () => ({
      title: "",
      layout: "default",
      background: "none",
      padding: "md",
      children: [],
    }),
    CanvasComponent: SectionCanvasComponent,
    InspectorComponent: SectionInspectorComponent,
  },
  reusable: {
    type: "reusable",
    label: "Reusable Block",
    icon: "🔄",
    schema: reusableSchema,
    defaultData: () => ({
      reusableId: "",
    }),
    CanvasComponent: ReusableCanvasComponent,
    InspectorComponent: ReusableInspectorComponent,
  },
  courses: {
    type: "courses",
    label: "Kurse & Termine",
    icon: "📅",
    schema: coursesSchema,
    defaultData: () => ({
      maxCourses: 3,
      maxTopics: 3,
      showEmptyMessage: true,
      backgroundImage: undefined,
      backgroundImageOpacity: 75,
      title: "Entdecke die Welt der Babyzeichen",
      subtitle: "In unserer Master-Übersicht findest du alle aktuellen Angebote. Tauche ein in eine entspannte Atmosphäre und stärke die Bindung zu deinem Kind.",
      contactLinkUrl: "/kontakt",
      contactLinkLabel: "Jetzt Kontakt aufnehmen",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  "current-appointments": {
    type: "current-appointments",
    label: "Aktuelle Termine",
    icon: "🗓️",
    schema: currentAppointmentsSchema,
    defaultData: () => ({
      title: "Aktuelle Termine",
      showCourses: true,
      showTopics: true,
      maxItems: 10,
      showEmptyMessage: true,
      width: "full",
      footerHtml: undefined,
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  "herzzeit-story": {
    type: "herzzeit-story",
    label: "HerzZeit-Geschichten",
    icon: "📖",
    schema: herzzeitStorySchema,
    defaultData: () => ({
      stories: [
        {
          id: createBlockId(),
          title: "",
          teaser: "",
          readingTime: "",
          audioUrl: "",
          imageUrl: "",
          fullText: "<p></p>",
        },
      ],
      style: "card",
      backgroundColor: undefined,
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
  contactForm: {
    type: "contactForm",
    label: "Kontaktformular",
    icon: "📧",
    schema: contactFormSchema,
    defaultData: () => ({
      name: "ULRIKE BARTHEL",
      role: "HEILPÄDAGOGIN & BABYKURSTRAINERIN",
      address: "Schönborner Str 47\n09661 Rossau",
      phone: "0174 / 837 24 63",
      phoneLink: "tel:+491748372463",
      email: "info@familien-herz-zeit.de",
      emailLink: "mailto:info@familien-herz-zeit.de",
      showOfficeHours: true,
      officeHoursTitle: "SPRECHZEITEN",
      officeHoursText: "Terminanfragen für Themenstunden werden in der Regel innerhalb von 48 Stunden beantwortet.",
      showFirstName: true,
      firstNameLabel: "VORNAME",
      firstNameRequired: true,
      showLastName: true,
      lastNameLabel: "NACHNAME",
      lastNameRequired: true,
      emailLabel: "EMAIL",
      emailRequired: true,
      messageLabel: "NACHRICHT",
      messageRequired: true,
      submitButtonText: "NACHRICHT SENDEN",
      enableRecaptcha: true,
      recaptchaSiteKey: undefined,
      layout: "default",
    }),
    CanvasComponent: BlockCanvasWrapper,
    InspectorComponent: BlockInspectorWrapper,
  },
};

/**
 * Erstellt einen neuen Block mit Default-Daten
 */
export function createBlockFromRegistry(type: BlockType): PageBlock {
  const entry = blockRegistry[type];
  if (!entry) {
    throw new Error(`Unknown block type: ${type}`);
  }

  return {
    id: createBlockId(),
    type,
    data: entry.defaultData(),
  };
}

/**
 * Gibt alle Block-Typen zurück
 */
export function getAllBlockTypes(): BlockType[] {
  return Object.keys(blockRegistry) as BlockType[];
}

/**
 * Gibt Registry Entry für einen Block-Typ zurück
 */
export function getBlockRegistryEntry(type: BlockType): BlockRegistryEntry {
  const entry = blockRegistry[type];
  if (!entry) {
    throw new Error(`Unknown block type: ${type}`);
  }
  return entry;
}

