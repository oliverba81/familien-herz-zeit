"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { Puck, type Overrides, type Viewports } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { puckConfig } from "@/lib/puck/config";
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

const VIEWPORTS: Viewports = [
  { width: 360, height: "auto", label: "Mobil" },
  { width: 768, height: "auto", label: "Tablet" },
  { width: 1280, height: "auto", label: "Desktop" },
  { width: "100%", height: "auto", label: "Voll" },
];

const CustomCssContext = createContext<string | null | undefined>(undefined);

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

const overrides: Partial<Overrides> = { iframe: IframeOverride };

export interface PuckPageEditorProps {
  data: PageContentPuck;
  customCss?: string | null;
  onPublish?: (data: PageContentPuck) => void | Promise<void>;
  onChange?: (data: PageContentPuck) => void;
}

export default function PuckPageEditor({
  data,
  customCss,
  onPublish,
  onChange,
}: PuckPageEditorProps) {
  return (
    <CustomCssContext.Provider value={customCss}>
      <Puck
         
        config={puckConfig as any}
         
        data={data as any}
        overrides={overrides}
        viewports={VIEWPORTS}
        iframe={{ enabled: true }}
         
        onPublish={onPublish as any}
         
        onChange={onChange as any}
      />
    </CustomCssContext.Provider>
  );
}
