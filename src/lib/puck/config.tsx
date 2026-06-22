"use client";

import type { Config } from "@puckeditor/core";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { RichTextField } from "./rich-text-field";
import { EmbedLivePreview } from "@/components/page-builder/embed-live/embed-live-preview";
import { getV2EmbedDefaultData } from "@/lib/page-builder/v2-embed-defaults";
import { responsiveFields, responsiveDefaults } from "./responsive";
import { MediaUrlField, MediaObjectField } from "./image-field";
import { SPACER_SIZES, SECTION_MAXWIDTH, sectionStyle } from "./blocks";
import {
  FeaturesView,
  TestimonialsView,
  ImageView,
  ButtonView,
  EmbedView,
  AccordionView,
  GalleryView,
  columnsContainerStyle,
} from "@/components/page-renderer/puck-blocks";
import { TabsView } from "@/components/page-renderer/tabs-view";

/** Puck-Komponentenname → V2-Embed-Blocktyp (für Edit-Preview + spätere Serialisierung). */
export const PUCK_TO_V2_EMBED: Record<string, string> = {
  Courses: "courses",
  CurrentAppointments: "current-appointments",
  HerzZeitStory: "herzzeit-story",
  ContactForm: "contactForm",
};

/**
 * Render eines V2-Embeds im EDITOR (Live-Preview, Client). Im LIVE-Render übernimmt
 * `renderPuckTree` (Server-Komponenten). Embed-Daten = Props (ohne Puck-interne id).
 */
function embedEditRender(puckType: string) {
  const blockType = PUCK_TO_V2_EMBED[puckType];
   
  return function EmbedRender(props: Record<string, any>) {
    const { id: _id, puck: _puck, editMode: _e, ...data } = props;
    return <EmbedLivePreview blockType={blockType} data={data} />;
  };
}

// Defaults der Embeds aus der vorhandenen Registry (Konfig == Frontend).
const coursesDefaults = getV2EmbedDefaultData("courses");
const appointmentsDefaults = getV2EmbedDefaultData("current-appointments");
const storyDefaults = getV2EmbedDefaultData("herzzeit-story");
const contactDefaults = getV2EmbedDefaultData("contactForm");

/** Boolean-Feld als Radio (Puck hat kein natives Checkbox-Feld). */
function boolField(label: string) {
  return {
    type: "radio" as const,
    label,
    options: [
      { label: "An", value: true },
      { label: "Aus", value: false },
    ],
  };
}

/**
 * Puck-Konfiguration (Must-have-Set v1: RichText, Section, Image + 4 Embeds).
 * Felder bewusst kuratiert/kompakt; volle Feldabdeckung folgt iterativ.
 */
 
export const puckConfig: Config<any> = {
  components: {
    RichText: {
      label: "Text",
      fields: {
        html: {
          type: "custom",
          render: ({ value, onChange }) => (
            <RichTextField value={value as string} onChange={onChange} />
          ),
        },
      },
      defaultProps: { html: "<p>Neuer Text …</p>" },
      render: ({ html }) => (
        <div
          className="tinymce-preview-content prose max-w-none text-md"
          dangerouslySetInnerHTML={{ __html: cleanAndConvertHtml(String(html ?? "")) }}
        />
      ),
    },

    Section: {
      label: "Sektion",
      fields: {
        background: { type: "text", label: "Hintergrundfarbe (z. B. #f9fafb)" },
        backgroundImage: {
          type: "custom",
          render: ({ value, onChange }) => (
            <MediaUrlField value={value as string} onChange={onChange} />
          ),
        },
        padding: {
          type: "select",
          options: [
            { label: "Kein", value: "none" },
            { label: "Klein", value: "sm" },
            { label: "Mittel", value: "md" },
            { label: "Groß", value: "lg" },
          ],
        },
        maxWidth: {
          type: "select",
          options: [
            { label: "Volle Breite", value: "none" },
            { label: "Schmal", value: "narrow" },
            { label: "Breit", value: "wide" },
          ],
        },
        className: { type: "text" },
        anchorId: { type: "text", label: "Anker-ID (für Sprungmarken, z. B. kontakt)" },
        children: { type: "slot" },
      },
      defaultProps: { background: "", backgroundImage: "", padding: "md", maxWidth: "none", className: "", anchorId: "" },
       
      render: ({ background, backgroundImage, padding, maxWidth, className, anchorId, children: Children }: any) => (
        <section
          id={anchorId || undefined}
          className={className || undefined}
          style={sectionStyle({ background, backgroundImage, padding })}
        >
          <div className={SECTION_MAXWIDTH[maxWidth as string] || undefined}>
            {Children ? <Children /> : null}
          </div>
        </section>
      ),
    },

    Image: {
      label: "Bild",
      fields: {
        src: {
          type: "custom",
          render: ({ value, onChange }) => (
            <MediaUrlField value={value as string} onChange={onChange} />
          ),
        },
        alt: { type: "text" },
        caption: { type: "text" },
        width: {
          type: "select",
          label: "Breite",
          options: [
            { label: "Klein", value: "sm" },
            { label: "Mittel", value: "md" },
            { label: "Groß", value: "lg" },
            { label: "Voll", value: "full" },
          ],
        },
        align: {
          type: "radio",
          label: "Ausrichtung",
          options: [
            { label: "Links", value: "left" },
            { label: "Mitte", value: "center" },
            { label: "Rechts", value: "right" },
          ],
        },
        rounded: {
          type: "select",
          label: "Ecken",
          options: [
            { label: "Eckig", value: "none" },
            { label: "Leicht rund", value: "sm" },
            { label: "Stark rund", value: "lg" },
            { label: "Rund", value: "full" },
          ],
        },
        bordered: boolField("Rahmen"),
        href: { type: "text", label: "Verlinken auf (URL, optional)" },
        newTab: boolField("In neuem Tab öffnen"),
      },
      defaultProps: {
        src: "",
        alt: "",
        caption: "",
        width: "full",
        align: "left",
        rounded: "none",
        bordered: false,
        href: "",
        newTab: false,
      },

      render: (props: any) => <ImageView {...props} />,
    },

    Courses: {
      label: "Kurse & Termine",
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        maxCourses: { type: "number" },
        maxTopics: { type: "number" },
        showEmptyMessage: boolField("Leer-Hinweis"),
        contactLinkUrl: { type: "text" },
        contactLinkLabel: { type: "text" },
        backgroundImage: {
          type: "custom",
          label: "Hintergrundbild",
          render: ({ value, onChange }) => (
            <MediaObjectField
              value={value as { url?: string } | undefined}
              onChange={onChange}
            />
          ),
        },
        backgroundImageOpacity: { type: "number" },
      },
      defaultProps: coursesDefaults,
      render: embedEditRender("Courses"),
    },

    CurrentAppointments: {
      label: "Aktuelle Termine",
      fields: {
        title: { type: "text" },
        showCourses: boolField("Kurse zeigen"),
        showTopics: boolField("Themen zeigen"),
        maxItems: { type: "number" },
        showEmptyMessage: boolField("Leer-Hinweis"),
        width: {
          type: "select",
          options: [
            { label: "Voll", value: "full" },
            { label: "Schmal", value: "narrow" },
          ],
        },
        footerHtml: { type: "textarea" },
      },
      defaultProps: appointmentsDefaults,
      render: embedEditRender("CurrentAppointments"),
    },

    HerzZeitStory: {
      label: "HerzZeit-Geschichten",
      fields: {
        title: { type: "text" },
        style: {
          type: "select",
          options: [
            { label: "Karte", value: "card" },
            { label: "Banner", value: "banner" },
            { label: "Minimal", value: "minimal" },
          ],
        },
        backgroundColor: { type: "text" },
        stories: {
          type: "array",
           
          getItemSummary: (item: any) => item?.title || "Geschichte",
          arrayFields: {
            title: { type: "text" },
            teaser: { type: "textarea" },
            readingTime: { type: "text" },
            audioUrl: { type: "text" },
            imageUrl: { type: "text" },
            fullText: { type: "textarea" },
          },
        },
      },
      defaultProps: storyDefaults,
      render: embedEditRender("HerzZeitStory"),
    },

    ContactForm: {
      label: "Kontaktformular",
      fields: {
        name: { type: "text" },
        role: { type: "text" },
        address: { type: "textarea" },
        phone: { type: "text" },
        phoneLink: { type: "text" },
        email: { type: "text" },
        emailLink: { type: "text" },
        showOfficeHours: boolField("Sprechzeiten zeigen"),
        officeHoursTitle: { type: "text" },
        officeHoursText: { type: "textarea" },
        showFirstName: boolField("Vorname-Feld"),
        firstNameLabel: { type: "text" },
        firstNameRequired: boolField("Vorname Pflicht"),
        showLastName: boolField("Nachname-Feld"),
        lastNameLabel: { type: "text" },
        lastNameRequired: boolField("Nachname Pflicht"),
        emailLabel: { type: "text" },
        emailRequired: boolField("E-Mail Pflicht"),
        messageLabel: { type: "text" },
        messageRequired: boolField("Nachricht Pflicht"),
        submitButtonText: { type: "text" },
        enableRecaptcha: boolField("reCAPTCHA"),
        recaptchaSiteKey: { type: "text" },
        layout: {
          type: "select",
          options: [
            { label: "Standard", value: "default" },
            { label: "Gestapelt", value: "stacked" },
          ],
        },
      },
      defaultProps: contactDefaults,
      render: embedEditRender("ContactForm"),
    },

    Columns: {
      label: "Spalten",
      fields: {
        count: {
          type: "radio",
          options: [
            { label: "2 Spalten", value: 2 },
            { label: "3 Spalten", value: 3 },
          ],
        },
        ratio: {
          type: "select",
          label: "Verhältnis",
          options: [
            { label: "Gleich", value: "" },
            { label: "2 : 1", value: "2-1" },
            { label: "1 : 2", value: "1-2" },
            { label: "3 : 2", value: "3-2" },
            { label: "2 : 1 : 1", value: "2-1-1" },
            { label: "1 : 2 : 1", value: "1-2-1" },
          ],
        },
        gap: {
          type: "select",
          label: "Abstand",
          options: [
            { label: "Klein", value: "sm" },
            { label: "Mittel", value: "md" },
            { label: "Groß", value: "lg" },
          ],
        },
        col1: { type: "slot" },
        col2: { type: "slot" },
        col3: { type: "slot" },
      },
      defaultProps: { count: 2, ratio: "", gap: "md" },
       
      render: ({ count, ratio, gap, col1: C1, col2: C2, col3: C3 }: any) => (
        <div className="fhz-columns" style={columnsContainerStyle(count, ratio, gap)}>
          <div>{C1 ? <C1 /> : null}</div>
          <div>{C2 ? <C2 /> : null}</div>
          {Number(count) >= 3 ? <div>{C3 ? <C3 /> : null}</div> : null}
        </div>
      ),
    },

    Spacer: {
      label: "Abstand",
      fields: {
        size: {
          type: "select",
          options: [
            { label: "Klein", value: "sm" },
            { label: "Mittel", value: "md" },
            { label: "Groß", value: "lg" },
            { label: "Sehr groß", value: "xl" },
          ],
        },
      },
      defaultProps: { size: "md" },
       
      render: ({ size }: any) => (
        <div style={{ height: SPACER_SIZES[size as string] ?? SPACER_SIZES.md }} />
      ),
    },

    Button: {
      label: "Button",
      fields: {
        text: { type: "text" },
        href: { type: "text" },
        icon: { type: "text", label: "Icon (optional, z. B. ➜ oder ✉)" },
        variant: {
          type: "radio",
          options: [
            { label: "Primär", value: "primary" },
            { label: "Sekundär", value: "secondary" },
          ],
        },
        size: {
          type: "select",
          label: "Größe",
          options: [
            { label: "Klein", value: "sm" },
            { label: "Mittel", value: "md" },
            { label: "Groß", value: "lg" },
          ],
        },
        align: {
          type: "radio",
          options: [
            { label: "Links", value: "left" },
            { label: "Mitte", value: "center" },
            { label: "Rechts", value: "right" },
          ],
        },
        newTab: boolField("In neuem Tab öffnen"),
      },
      defaultProps: {
        text: "Mehr erfahren",
        href: "/",
        icon: "",
        variant: "primary",
        size: "md",
        align: "left",
        newTab: false,
      },
       
      render: (props: any) => <ButtonView {...props} />,
    },

    Video: {
      label: "Video",
      fields: {
        src: {
          type: "custom",
          render: ({ value, onChange }) => (
            <MediaUrlField value={value as string} onChange={onChange} mediaType="video" />
          ),
        },
        title: { type: "text" },
      },
      defaultProps: { src: "", title: "" },
       
      render: ({ src, title }: any) =>
        src ? (
          <figure>
            <video src={src} controls style={{ width: "100%", height: "auto" }} />
            {title ? <figcaption>{title}</figcaption> : null}
          </figure>
        ) : (
          <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">
            Kein Video gewählt
          </div>
        ),
    },

    Heading: {
      label: "Überschrift",
      fields: {
        text: { type: "text" },
        level: {
          type: "select",
          options: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: n })),
        },
        align: {
          type: "radio",
          options: [
            { label: "Links", value: "left" },
            { label: "Mitte", value: "center" },
            { label: "Rechts", value: "right" },
          ],
        },
      },
      defaultProps: { text: "Überschrift", level: 2, align: "left" },
       
      render: ({ text, level, align }: any) => {
        const Tag = `h${[1, 2, 3, 4, 5, 6].includes(Number(level)) ? level : 2}` as
          | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return <Tag style={{ textAlign: align || "left" }}>{text || ""}</Tag>;
      },
    },

    Divider: {
      label: "Trennlinie",
      fields: {},
      defaultProps: {},
      render: () => <hr className="my-6 border-gray-200" />,
    },

    Features: {
      label: "Features",
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
           
          getItemSummary: (item: any) => item?.title || "Feature",
          arrayFields: {
            title: { type: "text" },
            text: { type: "textarea" },
          },
        },
      },
      defaultProps: {
        title: "",
        items: [
          { title: "Feature 1", text: "Beschreibung" },
          { title: "Feature 2", text: "Beschreibung" },
          { title: "Feature 3", text: "Beschreibung" },
        ],
      },
       
      render: ({ title, items }: any) => <FeaturesView title={title} items={items} />,
    },

    Testimonials: {
      label: "Testimonials",
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
           
          getItemSummary: (item: any) => item?.name || "Stimme",
          arrayFields: {
            name: { type: "text" },
            text: { type: "textarea" },
          },
        },
      },
      defaultProps: {
        title: "",
        items: [{ name: "Name", text: "Ein nettes Zitat." }],
      },
       
      render: ({ title, items }: any) => <TestimonialsView title={title} items={items} />,
    },

    Embed: {
      label: "Video/Embed (YouTube, Vimeo …)",
      fields: {
        url: { type: "text", label: "URL (YouTube, Vimeo oder iframe-Quelle)" },
        title: { type: "text", label: "Titel (Barrierefreiheit)" },
      },
      defaultProps: { url: "", title: "" },
       
      render: ({ url, title }: any) => <EmbedView url={url} title={title} />,
    },

    Accordion: {
      label: "Akkordeon / FAQ",
      fields: {
        items: {
          type: "array",
           
          getItemSummary: (item: any) => item?.question || "Frage",
          arrayFields: {
            question: { type: "text" },
            answer: { type: "textarea" },
          },
        },
      },
      defaultProps: {
        items: [
          { question: "Erste Frage?", answer: "Antwort …" },
          { question: "Zweite Frage?", answer: "Antwort …" },
        ],
      },
       
      render: ({ items }: any) => <AccordionView items={items} />,
    },

    Tabs: {
      label: "Reiter (Tabs)",
      fields: {
        items: {
          type: "array",
           
          getItemSummary: (item: any) => item?.label || "Reiter",
          arrayFields: {
            label: { type: "text" },
            content: { type: "textarea" },
          },
        },
      },
      defaultProps: {
        items: [
          { label: "Reiter 1", content: "Inhalt …" },
          { label: "Reiter 2", content: "Inhalt …" },
        ],
      },
       
      render: ({ items }: any) => <TabsView items={items} />,
    },

    Gallery: {
      label: "Galerie",
      fields: {
        layout: {
          type: "radio",
          label: "Darstellung",
          options: [
            { label: "Raster", value: "grid" },
            { label: "Slider", value: "slider" },
          ],
        },
        columns: {
          type: "select",
          label: "Spalten",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        items: {
          type: "array",
           
          getItemSummary: (item: any) => item?.alt || "Bild",
          arrayFields: {
            src: {
              type: "custom",
              render: ({ value, onChange }) => (
                <MediaUrlField value={value as string} onChange={onChange} />
              ),
            },
            alt: { type: "text" },
          },
        },
      },
      defaultProps: { layout: "grid", columns: 3, items: [] },

      render: ({ items, columns, layout }: any) => (
        <GalleryView items={items} columns={columns} layout={layout} />
      ),
    },

    Reusable: {
      label: "Wiederverwendbarer Block",
      fields: {
        reusableId: { type: "text" },
      },
      defaultProps: { reusableId: "" },
       
      render: ({ reusableId }: any) => (
        <div className="p-4 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50 text-center text-sm text-violet-800">
          🔄 Wiederverwendbarer Block
          {reusableId ? (
            <span className="block text-xs text-violet-500 mt-1">ID: {reusableId}</span>
          ) : (
            <span className="block text-xs text-violet-500 mt-1">Keine Referenz gewählt</span>
          )}
        </div>
      ),
    },
  },

  // Gruppierung der Blockliste im Editor (Puck-`categories`).
  categories: {
    layout: {
      title: "Layout",
      components: ["Section", "Columns", "Spacer", "Divider"],
    },
    content: {
      title: "Inhalt",
      components: [
        "Heading",
        "RichText",
        "Image",
        "Gallery",
        "Button",
        "Video",
        "Embed",
        "Accordion",
        "Tabs",
        "Features",
        "Testimonials",
      ],
    },
    embeds: {
      title: "Dynamische Inhalte",
      components: ["Courses", "CurrentAppointments", "HerzZeitStory", "ContactForm"],
    },
    advanced: {
      title: "Erweitert",
      components: ["Reusable"],
    },
  },
};

// Responsive-Sichtbarkeits-Felder (Feature 8) in jede Komponente spreizen (DRY).
for (const comp of Object.values(puckConfig.components)) {
  comp.fields = { ...comp.fields, ...responsiveFields };
  comp.defaultProps = { ...comp.defaultProps, ...responsiveDefaults };
}
