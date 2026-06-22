"use client";

import type { Config } from "@puckeditor/core";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { RichTextField } from "./rich-text-field";
import { EmbedLivePreview } from "@/components/page-builder/embed-live/embed-live-preview";
import { getV2EmbedDefaultData } from "@/lib/page-builder/v2-embed-defaults";
import { responsiveFields, responsiveDefaults } from "./responsive";
import { MediaUrlField, MediaObjectField } from "./image-field";
import { SPACER_SIZES, SECTION_MAXWIDTH, sectionStyle } from "./blocks";
import { FeaturesView, TestimonialsView } from "@/components/page-renderer/puck-blocks";

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
        children: { type: "slot" },
      },
      defaultProps: { background: "", backgroundImage: "", padding: "md", maxWidth: "none", className: "" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ background, backgroundImage, padding, maxWidth, className, children: Children }: any) => (
        <section
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
      },
      defaultProps: { src: "", alt: "", caption: "" },
       
      render: ({ src, alt, caption }: any) =>
        src ? (
          <figure>
            { }
            <img src={src} alt={alt || ""} style={{ maxWidth: "100%", height: "auto" }} />
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        ) : (
          <div className="p-6 bg-gray-100 text-center text-gray-500 rounded">
            Kein Bild gewählt
          </div>
        ),
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        col1: { type: "slot" },
        col2: { type: "slot" },
        col3: { type: "slot" },
      },
      defaultProps: { count: 2 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ count, col1: C1, col2: C2, col3: C3 }: any) => (
        <div
          className="fhz-columns"
          style={{ ["--cols" as string]: String(count ?? 2) }}
        >
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ size }: any) => (
        <div style={{ height: SPACER_SIZES[size as string] ?? SPACER_SIZES.md }} />
      ),
    },

    Button: {
      label: "Button",
      fields: {
        text: { type: "text" },
        href: { type: "text" },
        variant: {
          type: "radio",
          options: [
            { label: "Primär", value: "primary" },
            { label: "Sekundär", value: "secondary" },
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
      },
      defaultProps: { text: "Mehr erfahren", href: "/", variant: "primary", align: "left" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ text, href, variant, align }: any) => (
        <div style={{ textAlign: align || "left" }}>
          <a
            href={href || "#"}
            className={
              variant === "secondary"
                ? "inline-block px-5 py-2.5 rounded-lg border border-rose-500 text-rose-600 font-semibold"
                : "inline-block px-5 py-2.5 rounded-lg bg-rose-500 text-white font-semibold"
            }
          >
            {text || "Button"}
          </a>
        </div>
      ),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ title, items }: any) => <FeaturesView title={title} items={items} />,
    },

    Testimonials: {
      label: "Testimonials",
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: ({ title, items }: any) => <TestimonialsView title={title} items={items} />,
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
};

// Responsive-Sichtbarkeits-Felder (Feature 8) in jede Komponente spreizen (DRY).
for (const comp of Object.values(puckConfig.components)) {
  comp.fields = { ...comp.fields, ...responsiveFields };
  comp.defaultProps = { ...comp.defaultProps, ...responsiveDefaults };
}
