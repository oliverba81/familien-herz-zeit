"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Node } from "@tiptap/core";
import { useEffect, useState, useRef } from "react";

// Custom Extension für Paragraph mit inline Styles
const ParagraphWithStyles = Node.create({
  name: "paragraph",
  priority: 1000,
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "p" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["p", HTMLAttributes, 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return {
            style: attributes.style,
          };
        },
      },
    };
  },
});

// Custom Extension für div-Elemente mit inline Styles
const DivWithStyles = Node.create({
  name: "divWithStyles",
  group: "block",
  content: "block+",
  parseHTML() {
    return [{ tag: "div" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return {
            style: attributes.style,
          };
        },
      },
    };
  },
});

// Custom Extension für inline Styles auf allen Elementen
const InlineStyles = Node.create({
  name: "inlineStyles",
  priority: 1000,
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "textStyle", "hardBreak", "horizontalRule"],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute("style");
              return style || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              return {
                style: attributes.style,
              };
            },
          },
        },
      },
    ];
  },
});


// Custom Extension für Schriftgröße
const FontSize = TextStyle.extend({
  name: "fontSize",
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => {
          const fontSize = element.style.fontSize;
          return fontSize ? fontSize : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize: (fontSize: string) => ({ chain, state, dispatch }) => {
        // Entferne zuerst alle vorhandenen fontSize-Marks im markierten Bereich
        return chain()
          .unsetMark(this.name)
          .setMark(this.name, { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      },
    };
  },
  // Verhindere, dass mehrere Marks übereinander gelegt werden
  excludes: "fontSize",
  // Stelle sicher, dass das HTML sofort aktualisiert wird
  priority: 1000,
});

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  compact?: boolean;
  editable?: boolean;
}

export default function TipTapEditor({
  content,
  onChange,
  compact = false,
  editable = true,
}: TipTapEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);
  const isUpdatingFromExternalRef = useRef(false);

  useEffect(() => {
    // Mount-Flag (immediatelyRender: false), damit der TipTap-Editor erst
    // clientseitig nach dem Mount gerendert wird (SSR-Sicherheit).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Deaktiviere Standard-Paragraph, verwende unseren
      }),
      ParagraphWithStyles,
      DivWithStyles,
      InlineStyles,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Ignoriere Updates, die von externen Content-Änderungen kommen
      if (isUpdatingFromExternalRef.current) {
        isUpdatingFromExternalRef.current = false;
        return;
      }
      // Verwende requestAnimationFrame, um sicherzustellen, dass alle DOM-Änderungen abgeschlossen sind
      requestAnimationFrame(() => {
        const html = editor.getHTML();
        setHtmlContent(html);
        onChange(html);
      });
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${compact ? "min-h-[150px]" : "min-h-[200px]"} px-3 py-2`,
      },
      transformPastedHTML: (html) => {
        // Behalte alle inline Styles beim Einfügen
        return html;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const currentHtml = editor.getHTML();
      // Normalisiere beide HTML-Strings für Vergleich (entferne Leerzeichen)
      const normalizedContent = content.trim();
      const normalizedCurrent = currentHtml.trim();
      
      if (normalizedContent !== normalizedCurrent) {
        isUpdatingFromExternalRef.current = true;
        editor.commands.setContent(content, { emitUpdate: false }); // nicht emit onUpdate
        // Synchronisiert den lokalen HTML-Spiegel mit dem extern (per Prop) und
        // imperativ in die Editor-Instanz gesetzten Inhalt.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHtmlContent(content);
        // Stelle sicher, dass der Editor sofort aktualisiert wird
        requestAnimationFrame(() => {
          isUpdatingFromExternalRef.current = false;
        });
      }
    }
  }, [content, editor]);

  if (!isMounted || !editor) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg bg-gray-50">
          <div className="px-2 py-1 text-sm text-gray-400">Lädt Editor...</div>
        </div>
        <div className="border border-gray-300 rounded-lg min-h-[200px] flex items-center justify-center text-gray-400">
          Editor wird geladen...
        </div>
      </div>
    );
  }

  const fontSizeOptions = [
    { value: "0.75rem", label: "Sehr klein (12px)" },
    { value: "0.875rem", label: "Klein (14px)" },
    { value: "1rem", label: "Mittel (16px)" },
    { value: "1.125rem", label: "Groß (18px)" },
    { value: "1.25rem", label: "Größer (20px)" },
    { value: "1.5rem", label: "Sehr groß (24px)" },
    { value: "1.875rem", label: "Extra groß (30px)" },
  ];

  const handleFontSize = (size: string) => {
    if (size && editor) {
      editor.chain().focus().setFontSize(size).run();
      // Stelle sicher, dass das HTML sofort aktualisiert wird
      // Verwende requestAnimationFrame, um sicherzustellen, dass die DOM-Änderungen abgeschlossen sind
      requestAnimationFrame(() => {
        const html = editor.getHTML();
        setHtmlContent(html);
        // Rufe onChange nur auf, wenn es sich von der aktuellen htmlContent unterscheidet
        if (html !== htmlContent) {
          onChange(html);
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 font-semibold ${
            editor.isActive("bold") ? "bg-gray-200" : ""
          }`}
          title="Fett"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 italic ${
            editor.isActive("italic") ? "bg-gray-200" : ""
          }`}
          title="Kursiv"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("underline") ? "bg-gray-200" : ""
          }`}
          title="Unterstrichen"
        >
          U
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
          }`}
          title="Überschrift 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
          }`}
          title="Überschrift 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("paragraph") ? "bg-gray-200" : ""
          }`}
          title="Absatz"
        >
          P
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("bulletList") ? "bg-gray-200" : ""
          }`}
          title="Aufzählung"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("orderedList") ? "bg-gray-200" : ""
          }`}
          title="Nummerierte Liste"
        >
          1.
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
          }`}
          title="Links ausrichten"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
          }`}
          title="Zentrieren"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
          }`}
          title="Rechts ausrichten"
        >
          ➡
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleFontSize(e.target.value);
              e.target.value = ""; // Reset
            }
          }}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 focus:ring-2 focus:ring-rose-500"
          title="Schriftgröße"
        >
          <option value="">A</option>
          {fontSizeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("URL eingeben:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 ${
            editor.isActive("link") ? "bg-gray-200" : ""
          }`}
          title="Link einfügen"
        >
          🔗
        </button>
      </div>

      {/* Editor */}
      <div className="border border-gray-300 rounded-lg">
        <EditorContent 
          editor={editor}
          className="prose prose-sm max-w-none"
        />
      </div>

      {/* HTML bearbeiten */}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 py-1">
          HTML bearbeiten
        </summary>
        <textarea
          value={htmlContent}
          onChange={(e) => {
            const newHtml = e.target.value;
            setHtmlContent(newHtml);
            isUpdatingFromExternalRef.current = true;
            // Aktualisiere den Editor sofort mit dem neuen HTML
            editor.commands.setContent(newHtml, { emitUpdate: false });
            // Rufe onChange direkt auf, damit die Änderungen gespeichert werden
            onChange(newHtml);
          }}
          onBlur={(e) => {
            // Stelle sicher, dass der Editor auch beim Verlassen des Textareas aktualisiert ist
            const newHtml = e.target.value;
            if (newHtml !== editor.getHTML()) {
              isUpdatingFromExternalRef.current = true;
              editor.commands.setContent(newHtml, { emitUpdate: false });
            }
          }}
          rows={6}
          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
        />
      </details>
    </div>
  );
}

