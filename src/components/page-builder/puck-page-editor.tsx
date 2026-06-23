"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { Puck, type Overrides, type Viewports } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./puck-overrides.css";
import { puckConfig } from "@/lib/puck/config";
import { PuckInsertToolbar } from "./puck-insert-toolbar";
import { syncIframeStyles } from "@/lib/puck/iframe-style-sync";
import type { PageContentPuck } from "@/lib/page-builder/schema";

/**
 * Editor-Hülle für den Puck-Visual-Builder (hinter Feature-Flag genutzt).
 *
 * - Same-origin iframe-Canvas mit echten Viewport-Breiten (echtes @media/Responsive).
 * - Stylesheet- + customCss-Injektion in das iframe via `overrides.iframe` → 1:1-Vorschau.
 * - Speichern/Publizieren über die übergebenen Callbacks (Integration in page-form folgt).
 *
 * Visuelle Verifikation (iframe-Treue, RichText-Fokus, Responsive) erfolgt im Browser.
 */

// Eigenes Icon für die „Voll"-Breite (Puck bringt nur Smartphone/Tablet/Monitor mit).
const MaximizeIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const VIEWPORTS: Viewports = [
  { width: 360, height: "auto", label: "Mobil", icon: "Smartphone" },
  { width: 768, height: "auto", label: "Tablet", icon: "Tablet" },
  { width: 1280, height: "auto", label: "Desktop", icon: "Monitor" },
  { width: "100%", height: "auto", label: "Voll", icon: MaximizeIcon },
];

const CustomCssContext = createContext<string | null | undefined>(undefined);
const BackHrefContext = createContext<string | undefined>(undefined);

/** Injiziert Eltern-Stylesheets + customCss in das Preview-iframe (stabile Identität). */
function IframeOverride({
  children,
  document: doc,
}: {
  children: ReactNode;
  document?: Document;
}) {
  const customCss = useContext(CustomCssContext);
  useEffect(() => {
    if (!doc) return;
    return syncIframeStyles(doc, customCss);
  }, [doc, customCss]);
  return <>{children}</>;
}

/** Kopfzeilen-Aktionen: Einfüge-Toolbar links, „Zurück" direkt neben „Publish". */
function HeaderActions({ children }: { children: ReactNode }) {
  const backHref = useContext(BackHrefContext);
  return (
    <>
      <PuckInsertToolbar />
      {backHref && (
        <a
          href={backHref}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
        >
          ← Zurück
        </a>
      )}
      {children}
    </>
  );
}

const overrides: Partial<Overrides> = {
  iframe: IframeOverride,
  headerActions: HeaderActions,
};

export interface PuckPageEditorProps {
  data: PageContentPuck;
  customCss?: string | null;
  /** Ziel des „Zurück"-Buttons in der Kopfzeile (neben „Publish"). */
  backHref?: string;
  onPublish?: (data: PageContentPuck) => void | Promise<void>;
  onChange?: (data: PageContentPuck) => void;
}

export default function PuckPageEditor({
  data,
  customCss,
  backHref,
  onPublish,
  onChange,
}: PuckPageEditorProps) {
  return (
    <CustomCssContext.Provider value={customCss}>
      <BackHrefContext.Provider value={backHref}>
        <div className="fhz-puck-host">
          <Puck

            config={puckConfig as any}

            data={data as any}
            overrides={overrides}
            viewports={VIEWPORTS}
            iframe={{ enabled: true }}

            onPublish={onPublish as any}

            onChange={onChange as any}
          />
        </div>
      </BackHrefContext.Provider>
    </CustomCssContext.Provider>
  );
}
