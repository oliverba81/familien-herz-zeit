"use client";

import type { Config } from "@puckeditor/core";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";
import { RichTextField } from "./rich-text-field";
import { EmbedLivePreview } from "@/components/page-builder/embed-live/embed-live-preview";
import { getV2EmbedDefaultData } from "@/lib/page-builder/v2-embed-defaults";

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
        className: { type: "text" },
        children: { type: "slot" },
      },
      defaultProps: { className: "" },
       
      render: ({ className, children: Children }: any) => (
        <section className={className || undefined}>
          {Children ? <Children /> : null}
        </section>
      ),
    },

    Image: {
      label: "Bild",
      fields: {
        src: { type: "text" },
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
      },
      defaultProps: coursesDefaults,
      render: embedEditRender("Courses"),
    },

    CurrentAppointments: {
      label: "Aktuelle Termine",
      fields: {
        title: { type: "text" },
        maxItems: { type: "number" },
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
      },
      defaultProps: storyDefaults,
      render: embedEditRender("HerzZeitStory"),
    },

    ContactForm: {
      label: "Kontaktformular",
      fields: {
        name: { type: "text" },
        email: { type: "text" },
        submitButtonText: { type: "text" },
      },
      defaultProps: contactDefaults,
      render: embedEditRender("ContactForm"),
    },
  },
};
