import type { ToolbarItemConfig } from "@/vendor/wysiwyg-editor/core/types";

/**
 * Toolbar-Konfigurationen für den einvendorten WYSIWYG-Editor.
 *
 * Wichtig: Command-/Icon-Namen sind exakt die vom Editor registrierten Werte
 * (verifiziert gegen die Plugins + toolbar/toolbarConfig.ts). Buttons/Dropdowns
 * führen `commands.exec(command)` nur aus, wenn `commands.has(command)`; fehlt ein
 * Icon-Key, zeigt der Button den Label-Text.
 */

const UNDO_REDO: ToolbarItemConfig[] = [
  { type: "button", command: "undo", icon: "undo", label: "undo", stateKey: "canUndo" },
  { type: "button", command: "redo", icon: "redo", label: "redo", stateKey: "canRedo" },
];

// Block-Dropdown: Das Dropdown führt den `option.value` direkt als Command aus,
// daher müssen die Werte die registrierten `format_*`-Commands sein.
const BLOCK_DROPDOWN: ToolbarItemConfig = {
  type: "dropdown",
  command: "setBlockType",
  label: "paragraph",
  options: [
    { value: "format_p", label: "Absatz" },
    { value: "format_h1", label: "Überschrift 1" },
    { value: "format_h2", label: "Überschrift 2" },
    { value: "format_h3", label: "Überschrift 3" },
    { value: "format_h4", label: "Überschrift 4" },
    { value: "format_blockquote", label: "Zitat" },
    { value: "format_pre", label: "Code-Block" },
  ],
};

const INLINE_FORMAT: ToolbarItemConfig[] = [
  { type: "button", command: "bold", icon: "bold", label: "bold", stateKey: "isBold" },
  { type: "button", command: "italic", icon: "italic", label: "italic", stateKey: "isItalic" },
  { type: "button", command: "underline", icon: "underline", label: "underline", stateKey: "isUnderline" },
  { type: "button", command: "strikethrough", icon: "strikethrough", label: "strikethrough", stateKey: "isStrikethrough" },
];

const COLORS: ToolbarItemConfig[] = [
  { type: "color", command: "textColor", icon: "text-color", label: "textColor" },
  { type: "color", command: "bgColor", icon: "bg-color", label: "highlightColor" },
];

const ALIGN: ToolbarItemConfig[] = [
  { type: "button", command: "alignLeft", icon: "align-left", label: "alignLeft" },
  { type: "button", command: "alignCenter", icon: "align-center", label: "alignCenter" },
  { type: "button", command: "alignRight", icon: "align-right", label: "alignRight" },
  { type: "button", command: "alignJustify", icon: "align-justify", label: "alignJustify" },
];

const LISTS: ToolbarItemConfig[] = [
  { type: "button", command: "bulletList", icon: "list-ul", label: "bulletList", stateKey: "isInUnorderedList" },
  { type: "button", command: "numberedList", icon: "list-ol", label: "numberedList", stateKey: "isInOrderedList" },
  { type: "button", command: "indent", icon: "indent", label: "indent" },
  { type: "button", command: "outdent", icon: "outdent", label: "outdent" },
];

const FONT_FAMILY: ToolbarItemConfig = {
  type: "dropdown",
  command: "setFontFamily",
  label: "fontFamily",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Georgia", label: "Georgia" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Courier New", label: "Courier New" },
    { value: "Verdana", label: "Verdana" },
    { value: "Trebuchet MS", label: "Trebuchet MS" },
    { value: "Comic Sans MS", label: "Comic Sans MS" },
    { value: "Impact", label: "Impact" },
    { value: "Tahoma", label: "Tahoma" },
  ],
};

const fontSizeDropdown = (sizes: string[]): ToolbarItemConfig => ({
  type: "dropdown",
  command: "setFontSize",
  label: "fontSize",
  options: sizes.map((s) => ({ value: `${s}px`, label: s })),
});

/** Block-Editor (richText): undo/redo · Blocktyp · Inline · Farben · Align · Listen · clearFormat/Source. */
export const BLOCK_TOOLBAR: ToolbarItemConfig[][] = [
  UNDO_REDO,
  [BLOCK_DROPDOWN],
  INLINE_FORMAT,
  COLORS,
  ALIGN,
  LISTS,
  [
    { type: "button", command: "clearFormat", icon: "eraser", label: "clearFormat" },
    { type: "button", command: "toggleSource", icon: "source", label: "sourceCode" },
  ],
];

/** E-Mail-Editor: wie Block + Schriftart/-größe. */
export const EMAIL_TOOLBAR: ToolbarItemConfig[][] = [
  UNDO_REDO,
  [BLOCK_DROPDOWN],
  [FONT_FAMILY, fontSizeDropdown(["8", "10", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "60", "72"])],
  INLINE_FORMAT,
  COLORS,
  ALIGN,
  LISTS,
  [
    { type: "button", command: "clearFormat", icon: "eraser", label: "clearFormat" },
    { type: "button", command: "toggleSource", icon: "source", label: "sourceCode" },
  ],
];

/**
 * V2-Page-Builder. Enthält zusätzlich sub/superscript, Tabelle, Zitat/HR,
 * Sonderzeichen/Suchen, Vollbild und den Custom-Button `fhzMedia` (Command wird
 * beim Editor-Mount registriert; Item muss statisch hier stehen, da Toolbar-Items
 * nicht zur Laufzeit ergänzt werden können).
 */
export const V2_TOOLBAR: ToolbarItemConfig[][] = [
  UNDO_REDO,
  [fontSizeDropdown(["12", "14", "16", "18", "20", "24", "28", "32", "36", "48"])],
  [
    ...INLINE_FORMAT,
    { type: "button", command: "subscript", icon: "subscript", label: "subscript", stateKey: "isSubscript" },
    { type: "button", command: "superscript", icon: "superscript", label: "superscript", stateKey: "isSuperscript" },
  ],
  COLORS,
  ALIGN,
  LISTS,
  [
    { type: "button", command: "insertLink", icon: "link", label: "insertLink" },
    { type: "button", command: "insertImage", icon: "image", label: "insertImage" },
    { type: "button", command: "fhzMedia", icon: "image", label: "Aus Mediathek", tooltip: "Bild aus Mediathek einfügen" },
  ],
  [{ type: "button", command: "insertTable", icon: "table", label: "insertTable" }],
  [
    { type: "button", command: "format_blockquote", icon: "quote", label: "blockquote" },
    { type: "button", command: "insertHR", icon: "hr", label: "horizontalRule" },
  ],
  [
    { type: "button", command: "specialChars", icon: "omega", label: "specialChars" },
    { type: "button", command: "findReplace", icon: "search", label: "findReplace" },
  ],
  [
    { type: "button", command: "clearFormat", icon: "eraser", label: "clearFormat" },
    { type: "button", command: "toggleSource", icon: "source", label: "sourceCode" },
    { type: "button", command: "toggleFullscreen", icon: "fullscreen", label: "fullscreen" },
  ],
];
