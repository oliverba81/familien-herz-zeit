"use client";

import React from "react";
import HerzZeitStoryBlock from "@/components/stories/herzzeit-story-block";
import ContactFormBlock from "@/components/page-renderer/contact-form-block";
import CoursesLive from "./courses-live";
import CurrentAppointmentsLive from "./current-appointments-live";
import { EmbedError } from "./embed-status";
import type {
  CoursesBlockData,
  CurrentAppointmentsBlockData,
  HerzZeitStoryBlockData,
  ContactFormBlockData,
} from "@/lib/page-builder/types";

/** Fängt Render-Fehler eines einzelnen Embeds ab, damit der Editor nicht abstürzt. */
class EmbedErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <EmbedError message="Vorschau konnte nicht gerendert werden." />;
    }
    return this.props.children;
  }
}

/**
 * Rendert die echte React-Komponente für einen Embed-Block in der Editor-Vorschau.
 * Kontaktformular läuft im Vorschau-Modus (kein Mailversand, kein reCAPTCHA).
 */
export function EmbedLivePreview({
  blockType,
  data,
}: {
  blockType: string;
  data: Record<string, unknown>;
}) {
  let content: React.ReactNode = null;
  switch (blockType) {
    case "courses":
      content = <CoursesLive data={data as unknown as CoursesBlockData} />;
      break;
    case "current-appointments":
      content = (
        <CurrentAppointmentsLive
          data={data as unknown as CurrentAppointmentsBlockData}
        />
      );
      break;
    case "herzzeit-story":
      content = (
        <HerzZeitStoryBlock
          data={data as unknown as HerzZeitStoryBlockData}
          disableModal
        />
      );
      break;
    case "contactForm":
      content = (
        <ContactFormBlock data={data as unknown as ContactFormBlockData} preview />
      );
      break;
    default:
      content = null;
  }
  return <EmbedErrorBoundary>{content}</EmbedErrorBoundary>;
}
