import type { ToolbarItemConfig } from '../core/types';

export const DEFAULT_TOOLBAR: ToolbarItemConfig[][] = [
  // History
  [
    { type: 'button', command: 'undo', icon: 'undo', label: 'undo', stateKey: 'canUndo' },
    { type: 'button', command: 'redo', icon: 'redo', label: 'redo', stateKey: 'canRedo' },
  ],
  // Paragraph style
  [
    {
      type: 'dropdown',
      command: 'setBlockType',
      label: 'paragraph',
      options: [
        { value: 'format_p', label: 'Paragraph' },
        { value: 'format_h1', label: 'Heading 1' },
        { value: 'format_h2', label: 'Heading 2' },
        { value: 'format_h3', label: 'Heading 3' },
        { value: 'format_h4', label: 'Heading 4' },
        { value: 'format_h5', label: 'Heading 5' },
        { value: 'format_h6', label: 'Heading 6' },
        { value: 'format_blockquote', label: 'Blockquote' },
        { value: 'format_pre', label: 'Code Block' },
      ],
    },
  ],
  // Font family + size
  [
    {
      type: 'dropdown',
      command: 'setFontFamily',
      label: 'fontFamily',
      options: [
        { value: 'Arial', label: 'Arial' },
        { value: 'Helvetica', label: 'Helvetica' },
        { value: 'Georgia', label: 'Georgia' },
        { value: 'Times New Roman', label: 'Times New Roman' },
        { value: 'Courier New', label: 'Courier New' },
        { value: 'Verdana', label: 'Verdana' },
        { value: 'Trebuchet MS', label: 'Trebuchet MS' },
        { value: 'Comic Sans MS', label: 'Comic Sans MS' },
        { value: 'Impact', label: 'Impact' },
        { value: 'Palatino', label: 'Palatino' },
      ],
    },
    {
      type: 'dropdown',
      command: 'setFontSize',
      label: 'fontSize',
      options: [
        '8','9','10','11','12','14','16','18','20','24','28','32','36','48','72'
      ].map(s => ({ value: `${s}px`, label: s })),
    },
  ],
  // Text formatting
  [
    { type: 'button', command: 'bold', icon: 'bold', label: 'bold', stateKey: 'isBold' },
    { type: 'button', command: 'italic', icon: 'italic', label: 'italic', stateKey: 'isItalic' },
    { type: 'button', command: 'underline', icon: 'underline', label: 'underline', stateKey: 'isUnderline' },
    { type: 'button', command: 'strikethrough', icon: 'strikethrough', label: 'strikethrough', stateKey: 'isStrikethrough' },
    { type: 'button', command: 'inlineCode', icon: 'code', label: 'inlineCode', stateKey: 'isInlineCode' },
    { type: 'button', command: 'subscript', icon: 'subscript', label: 'subscript', stateKey: 'isSubscript' },
    { type: 'button', command: 'superscript', icon: 'superscript', label: 'superscript', stateKey: 'isSuperscript' },
    { type: 'button', command: 'clearFormat', icon: 'eraser', label: 'clearFormat' },
  ],
  // Colors
  [
    { type: 'color', command: 'textColor', icon: 'text-color', label: 'textColor' },
    { type: 'color', command: 'bgColor', icon: 'bg-color', label: 'highlightColor' },
  ],
  // Alignment
  [
    { type: 'button', command: 'alignLeft', icon: 'align-left', label: 'alignLeft' },
    { type: 'button', command: 'alignCenter', icon: 'align-center', label: 'alignCenter' },
    { type: 'button', command: 'alignRight', icon: 'align-right', label: 'alignRight' },
    { type: 'button', command: 'alignJustify', icon: 'align-justify', label: 'alignJustify' },
  ],
  // Lists
  [
    { type: 'button', command: 'bulletList', icon: 'list-ul', label: 'bulletList', stateKey: 'isInUnorderedList' },
    { type: 'button', command: 'numberedList', icon: 'list-ol', label: 'numberedList', stateKey: 'isInOrderedList' },
    { type: 'button', command: 'taskList', icon: 'list-check', label: 'taskList', stateKey: 'isInTaskList' },
    { type: 'button', command: 'indent', icon: 'indent', label: 'indent' },
    { type: 'button', command: 'outdent', icon: 'outdent', label: 'outdent' },
  ],
  // Insert
  [
    { type: 'button', command: 'insertLink', icon: 'link', label: 'insertLink' },
    { type: 'button', command: 'removeLink', icon: 'unlink', label: 'removeLink' },
    { type: 'button', command: 'insertImage', icon: 'image', label: 'insertImage' },
    { type: 'button', command: 'insertVideo', icon: 'video', label: 'insertVideo' },
    { type: 'button', command: 'insertTable', icon: 'table', label: 'insertTable' },
    { type: 'button', command: 'insertEmoji', icon: 'emoji', label: 'insertEmoji' },
    { type: 'button', command: 'specialChars', icon: 'omega', label: 'specialChars' },
    { type: 'button', command: 'insertHR', icon: 'hr', label: 'horizontalRule' },
  ],
  // Tools
  [
    { type: 'button', command: 'findReplace', icon: 'search', label: 'findReplace' },
    { type: 'button', command: 'toggleSource', icon: 'source', label: 'sourceCode' },
    { type: 'button', command: 'toggleFullscreen', icon: 'fullscreen', label: 'fullscreen' },
    { type: 'button', command: 'print', icon: 'print', label: 'print' },
    { type: 'button', command: 'showShortcuts', icon: 'keyboard', label: 'shortcutHelp' },
  ],
];
