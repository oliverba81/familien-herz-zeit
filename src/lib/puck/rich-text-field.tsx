"use client";

import { WysiwygEditor } from "@/vendor/wysiwyg-editor/react/WysiwygEditor";
import { V2_TOOLBAR } from "@/lib/wysiwyg/toolbars";

/**
 * Puck-Custom-Feld, das den vorhandenen WYSIWYG-Editor (alle 34 Funktionen/26 Plugins)
 * im Seiten-Panel einbettet. Editiert einen HTML-String-Prop (controlled).
 *
 * Bewusst im Eltern-Dokument (nicht im iframe) → kein doc/window-Umbau des Vendor-Cores.
 * Der Editor ist mount-only initialisiert und überspringt setHTML, wenn value === DOM,
 * daher übersteht er Pucks Re-Renders. onChange ist im Editor bereits debounced.
 */
export function RichTextField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="fhz-puck-richtext-field">
      <WysiwygEditor
        value={value ?? ""}
        onChange={(html) => onChange(html)}
        toolbar={V2_TOOLBAR}
        editorClass="tinymce-preview-content prose max-w-none text-md"
      />
    </div>
  );
}
