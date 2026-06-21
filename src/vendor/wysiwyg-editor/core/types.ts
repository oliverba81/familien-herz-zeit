export interface SelectionState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isInlineCode: boolean;
  blockType: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre' | 'li' | '';
  isInUnorderedList: boolean;
  isInOrderedList: boolean;
  isInTaskList: boolean;
  isInCodeBlock: boolean;
  isInBlockquote: boolean;
  isInTable: boolean;
  isInFigure: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify' | '';
  fontFamily: string;
  fontSize: string;
  textColor: string;
  bgColor: string;
  linkHref: string | null;
  isCollapsed: boolean;
  selectedText: string;
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorBlock {
  type: string;
  [key: string]: unknown;
}

export type EditorEvent =
  | 'ready'
  | 'change'
  | 'selectionChange'
  | 'historyChange'
  | 'focus'
  | 'blur'
  | 'modeChange'
  | 'themeChange'
  | 'command'
  | 'imageUpload'
  | 'autosave'
  | 'destroy';

export interface AutosaveOptions {
  enabled: boolean;
  interval?: number;
  storageKey?: string;
}

export interface EditorOptions {
  container: HTMLElement;
  initialHTML?: string;
  placeholder?: string;
  theme?: 'light' | 'dark' | 'auto';
  toolbar?: ToolbarItemConfig[][] | false;
  floatingToolbar?: boolean;
  autoGrow?: boolean;
  height?: string | number;
  maxHeight?: string;
  minHeight?: string;
  readonly?: boolean;
  autofocus?: boolean;
  spellcheck?: boolean;
  maxLength?: number;
  autosave?: AutosaveOptions;
  plugins?: PluginConstructor[];
  onReady?: () => void;
  onChange?: (html: string) => void;
  onSelectionChange?: (state: SelectionState) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onFocus?: () => void;
  onBlur?: () => void;
  onError?: (error: { type: 'imageUpload' | 'general'; message: string }) => void;
  icons?: 'custom' | 'lucide' | Partial<Record<string, string>>;
  locale?: 'en' | 'de' | Record<string, string>;
  codeHighlight?: boolean;
  dragDrop?: boolean;
  sanitize?: boolean;
  allowDataUrls?: boolean;
  historyLimit?: number;
  /** Milliseconds before `onChange` fires after edits. `0` = synchronous (no timer). Default 300. */
  onChangeDebounceMs?: number;
}

export interface ToolbarItemConfig {
  type: 'button' | 'dropdown' | 'separator' | 'color';
  command?: string;
  icon?: string;
  label?: string;
  stateKey?: keyof SelectionState;
  options?: Array<{ value: string; label: string }>;
  tooltip?: string;
}

export interface PluginConstructor {
  new (editor: unknown): unknown;
}

export type EventMap = {
  ready: [];
  change: [html: string];
  selectionChange: [state: SelectionState];
  historyChange: [state: { canUndo: boolean; canRedo: boolean }];
  focus: [];
  blur: [];
  modeChange: [state: { mode: 'edit' | 'source' | 'fullscreen' }];
  themeChange: [state: { theme: 'light' | 'dark' }];
  command: [state: { name: string; args: unknown }];
  imageUpload: [state: { file: File; url: string }];
  autosave: [state: { key: string }];
  destroy: [];
};
