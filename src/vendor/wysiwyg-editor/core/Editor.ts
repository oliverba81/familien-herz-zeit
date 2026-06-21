import type { EditorOptions, SelectionState, EditorBlock, EventMap } from './types';
import { EventEmitter } from './EventEmitter';
import { CommandRegistry } from './CommandRegistry';
import { SelectionManager } from './SelectionManager';
import { History } from './History';
import { Sanitizer } from './Sanitizer';
import { isEmptyEditor, normalizeContent, normalizeColorSpans } from './DOMUtils';
import { debounce } from './utils';
import { setLocale, t } from './i18n';
import type { BasePlugin } from '../plugins/BasePlugin';
import type { Toolbar } from '../toolbar/Toolbar';
import { getMarkdown, importMarkdown } from '../export/markdownExporter';
import { getJSON, importJSON } from '../export/jsonExporter';

export class Editor extends EventEmitter<EventMap> {
  readonly container: HTMLElement;
  readonly options: EditorOptions;
  readonly commands: CommandRegistry;

  editorEl!: HTMLElement;
  toolbarEl!: HTMLElement;
  wrapperEl!: HTMLElement;
  private _statusBar!: HTMLElement;

  selection!: SelectionManager;
  private _toolbar: Toolbar | null = null;
  private _history!: History;
  private _sanitizer: Sanitizer;
  private _plugins = new Map<string, BasePlugin>();
  private _isComposing = false;
  private _autosaveTimer: ReturnType<typeof setInterval> | null = null;
  _currentTheme: 'light' | 'dark' = 'light';
  private _isReadonly = false;
  private _isSourceMode = false;
  private _isFullscreen = false;
  private _sourceTextarea!: HTMLTextAreaElement;
  private _destroyed = false;

  private readonly _debouncedChange: ReturnType<typeof debounce<(...args: unknown[]) => void>> | null;

  constructor(options: EditorOptions) {
    super();
    this.container = options.container;
    this.options = options;
    this.commands = new CommandRegistry();
    this._sanitizer = new Sanitizer();
    const debounceMs = options.onChangeDebounceMs ?? 300;
    this._debouncedChange = debounceMs > 0
      ? debounce((...args: unknown[]) => {
        const html = args[0] as string;
        this._emitChange(html);
      }, debounceMs)
      : null;
    setLocale(options.locale ?? 'de');
    this._build();
    this._initHistory();
    this._initSelection();
    this._bindEvents();
    this._loadPlugins();
    this._applyInitialState();
  }

  private _emitChange(html: string): void {
    if (this._destroyed) return;
    this.emit('change', html);
    this.options.onChange?.(html);
  }

  /** Schedule or run `onChange` for the current editor HTML (respects `onChangeDebounceMs`). */
  private _scheduleContentChange(): void {
    if (this._destroyed) return;
    const html = this.getHTML();
    if (this._debouncedChange) {
      this._debouncedChange(html);
    } else {
      this._emitChange(html);
    }
  }

  private _build(): void {
    this.container.innerHTML = '';
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'wysiwyg-wrapper';
    this.wrapperEl.setAttribute('data-wysiwyg-theme', this.options.theme === 'dark' ? 'dark' : 'light');

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'wysiwyg-toolbar';
    this.toolbarEl.setAttribute('role', 'toolbar');
    this.toolbarEl.setAttribute('aria-label', 'Text Formatting');

    this.editorEl = document.createElement('div');
    this.editorEl.className = this.options.editorClass
      ? `wysiwyg-editor-area ${this.options.editorClass}`
      : 'wysiwyg-editor-area';
    this.editorEl.contentEditable = 'true';
    this.editorEl.setAttribute('role', 'textbox');
    this.editorEl.setAttribute('aria-multiline', 'true');
    this.editorEl.setAttribute('aria-label', t('placeholder'));
    this.editorEl.setAttribute('data-placeholder', this.options.placeholder ?? t('placeholder'));
    this.editorEl.setAttribute('data-gramm', 'false');
    this.editorEl.setAttribute('data-gramm_editor', 'false');
    if (this.options.spellcheck === false) {
      this.editorEl.setAttribute('spellcheck', 'false');
    }

    this._sourceTextarea = document.createElement('textarea');
    this._sourceTextarea.className = 'wysiwyg-source-textarea';
    this._sourceTextarea.setAttribute('spellcheck', 'false');
    this._sourceTextarea.setAttribute('autocomplete', 'off');
    this._sourceTextarea.setAttribute('autocorrect', 'off');
    this._sourceTextarea.setAttribute('autocapitalize', 'off');
    this._sourceTextarea.style.display = 'none';

    this._statusBar = document.createElement('div');
    this._statusBar.className = 'wysiwyg-status-bar';

    if (this.options.height) {
      const h = typeof this.options.height === 'number' ? `${this.options.height}px` : this.options.height;
      this.wrapperEl.style.setProperty('--wysiwyg-height', h);
      this.wrapperEl.setAttribute('data-fixed-height', '');
    }
    if (this.options.minHeight) {
      this.wrapperEl.style.setProperty('--wysiwyg-min-height', this.options.minHeight);
    }
    if (this.options.maxHeight) {
      this.editorEl.style.maxHeight = this.options.maxHeight;
      this.editorEl.style.overflowY = 'auto';
    }

    this.wrapperEl.appendChild(this.toolbarEl);
    this.wrapperEl.appendChild(this.editorEl);
    this.wrapperEl.appendChild(this._sourceTextarea);
    this.wrapperEl.appendChild(this._statusBar);
    this.container.appendChild(this.wrapperEl);
  }

  private _initHistory(): void {
    this._history = new History(
      this.editorEl,
      this.options.historyLimit ?? 100,
      (canUndo, canRedo) => {
        this.selection?.setHistoryState(canUndo, canRedo);
        this.emit('historyChange', { canUndo, canRedo });
      }
    );
    this._history.attach();
  }

  private _initSelection(): void {
    this.selection = new SelectionManager(this.editorEl, (state) => {
      this.emit('selectionChange', state);
      this.options.onSelectionChange?.(state);
    });
    this.selection.attach();
  }

  private _bindEvents(): void {
    this.editorEl.addEventListener('compositionstart', () => { this._isComposing = true; });
    this.editorEl.addEventListener('compositionend', () => {
      this._isComposing = false;
      this._history.debouncedSnapshot();
      this._updateWordCount();
      this._scheduleContentChange();
    });

    this.editorEl.addEventListener('input', () => {
      if (this._isComposing) return;
      this._updatePlaceholder();
      this._scheduleContentChange();
      this._updateWordCount();
    });

    this.editorEl.addEventListener('paste', (e) => this._onPaste(e));
    this.editorEl.addEventListener('drop', (e) => this._onDrop(e));
    this.editorEl.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        this.editorEl.classList.add('wysiwyg-drag-over');
      }
    });
    this.editorEl.addEventListener('dragleave', () => {
      this.editorEl.classList.remove('wysiwyg-drag-over');
    });

    document.addEventListener('keydown', this._onKeyDown);

    this.wrapperEl.addEventListener('focusin', () => {
      this.emit('focus');
      this.options.onFocus?.();
    });
    this.wrapperEl.addEventListener('focusout', (e) => {
      if (!this.wrapperEl.contains(e.relatedTarget as Node)) {
        this._debouncedChange?.cancel();
        this._emitChange(this.getHTML());
        this._history.snapshot();
        this.emit('blur');
        this.options.onBlur?.();
      }
    });

    this.editorEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'HR') {
        const range = document.createRange();
        range.selectNode(target);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        target.classList.add('wysiwyg-selected');
        e.preventDefault();
      } else {
        this.editorEl.querySelectorAll('hr.wysiwyg-selected').forEach(hr => hr.classList.remove('wysiwyg-selected'));
      }
    });

    this._sourceTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this._sourceTextarea.selectionStart;
        const end = this._sourceTextarea.selectionEnd;
        this._sourceTextarea.value =
          this._sourceTextarea.value.substring(0, start) + '  ' +
          this._sourceTextarea.value.substring(end);
        this._sourceTextarea.selectionStart = this._sourceTextarea.selectionEnd = start + 2;
      }
    });
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this.wrapperEl.contains(document.activeElement)) return;
    if (this._isReadonly) return;

    if (e.ctrlKey && e.key === 'a' && document.activeElement === this.editorEl) {
      e.preventDefault();
      this.selection.selectAll();
      return;
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        document.execCommand('insertText', false, text);
      }).catch(() => {
        // silently fail if clipboard not accessible
      });
      return;
    }

    if (e.key === 'F11') {
      e.preventDefault();
      this.toggleFullscreen();
      return;
    }

    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      if (this.commands.has('print')) this.commands.exec('print');
      return;
    }

    if (e.key === 'Tab' && document.activeElement === this.editorEl) {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      const inTable = !!anchor?.parentElement?.closest('td, th');
      const inList = !!anchor?.parentElement?.closest('li');
      const inFigcaption = !!anchor?.parentElement?.closest('figcaption');

      if (inFigcaption) {
        this.editorEl.focus();
      } else if (inTable) {
        if (this.commands.has('tableTabNext')) this.commands.exec('tableTabNext', { shift: e.shiftKey });
      } else if (inList) {
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      } else {
        document.execCommand('insertHTML', false, '    ');
      }
      return;
    }
  };

  private _onPaste(e: ClipboardEvent): void {
    const items = Array.from(e.clipboardData?.items ?? []);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && this.commands.has('insertImageFile')) {
          this.commands.exec('insertImageFile', file);
        }
        return;
      }
    }

    const html = e.clipboardData?.getData('text/html') ?? '';
    const text = e.clipboardData?.getData('text/plain') ?? '';
    e.preventDefault();

    if (html && (this.options.sanitize !== false)) {
      const sanitized = this._sanitizer.sanitize(html);
      document.execCommand('insertHTML', false, sanitized);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    this._history.snapshot();
  }

  private _onDrop(e: DragEvent): void {
    const files = Array.from(e.dataTransfer?.files ?? []);
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length > 0) {
      e.preventDefault();
      this.editorEl.classList.remove('wysiwyg-drag-over');
      images.forEach(file => {
        if (this.commands.has('insertImageFile')) {
          this.commands.exec('insertImageFile', file);
        }
      });
    }
  }

  private _loadPlugins(): void {
    // Plugins are loaded by the toolbar system
  }

  private _applyInitialState(): void {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    if (this.options.initialHTML) this.setHTML(this.options.initialHTML);
    else this._updatePlaceholder();
    if (this.options.theme === 'dark') this._applyTheme('dark');
    else if (this.options.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      this._applyTheme(mq.matches ? 'dark' : 'light');
      mq.addEventListener('change', (ev) => {
        if (this.options.theme === 'auto') this._applyTheme(ev.matches ? 'dark' : 'light');
      });
    }
    if (this.options.readonly) this.setReadonly(true);
    if (this.options.autofocus) setTimeout(() => this.focus(), 0);
    if (this.options.autosave?.enabled) this._startAutosave();
    this._history.snapshot();
    queueMicrotask(() => {
      if (this._destroyed) return;
      this.options.onReady?.();
    });
    setTimeout(() => {
      if (this._destroyed) return;
      this.emit('ready');
    }, 0);
  }

  _updatePlaceholder(): void {
    this.editorEl.classList.toggle('wysiwyg-empty', isEmptyEditor(this.editorEl));
  }

  _updateWordCount(): void {
    this.emit('selectionChange', this.selection.getState());
  }

  private _applyTheme(theme: 'light' | 'dark'): void {
    this._currentTheme = theme; // accessible externally
    this.wrapperEl.setAttribute('data-wysiwyg-theme', theme);
    this.emit('themeChange', { theme });
  }

  private _startAutosave(): void {
    const opts = this.options.autosave!;
    const key = opts.storageKey ?? 'wysiwyg-autosave';
    const interval = opts.interval ?? 30000;
    this._autosaveTimer = setInterval(() => {
      localStorage.setItem(key, this.getHTML());
      this.emit('autosave', { key });
    }, interval);
  }

  // Public API
  getHTML(): string {
    return this.editorEl.innerHTML;
  }

  setHTML(html: string): void {
    const sanitized = (this.options.sanitize !== false)
      ? this._sanitizer.sanitize(html)
      : html;
    this.editorEl.innerHTML = sanitized;
    normalizeContent(this.editorEl);
    this._updatePlaceholder();
    this._history.snapshot();
  }

  getText(): string {
    return this.editorEl.innerText ?? '';
  }

  getMarkdown(): string {
    return getMarkdown(this.editorEl);
  }

  importMarkdown(md: string): void {
    this.setHTML(importMarkdown(md));
  }

  getJSON(): EditorBlock[] {
    return getJSON(this.editorEl);
  }

  importJSON(blocks: EditorBlock[]): void {
    this.setHTML(importJSON(blocks));
  }

  isEmpty(): boolean {
    return isEmptyEditor(this.editorEl);
  }

  insertHTML(html: string): void {
    this.focus();
    const sanitized = (this.options.sanitize !== false)
      ? this._sanitizer.sanitize(html)
      : html;
    document.execCommand('insertHTML', false, sanitized);
  }

  async copyToClipboard(format: 'html' | 'text' | 'markdown' = 'html'): Promise<void> {
    let content = '';
    if (format === 'html') content = this.getHTML();
    else if (format === 'text') content = this.getText();
    else content = this.getMarkdown();
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  undo(): void { this._history.undo(); }
  redo(): void { this._history.redo(); }

  focus(): void { this.editorEl.focus(); }
  blur(): void { this.editorEl.blur(); }

  setTheme(theme: 'light' | 'dark'): void { this._applyTheme(theme); }

  setReadonly(readonly: boolean): void {
    this._isReadonly = readonly;
    this.editorEl.contentEditable = readonly ? 'false' : 'true';
    this.editorEl.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.setAttribute('contenteditable', readonly ? 'false' : 'true');
    });
    this.toolbarEl.querySelectorAll('button, select').forEach(el => {
      (el as HTMLButtonElement | HTMLSelectElement).disabled = readonly;
    });
    this.wrapperEl.classList.toggle('wysiwyg-readonly', readonly);
  }

  toggleFullscreen(): void {
    this._isFullscreen = !this._isFullscreen;
    this.wrapperEl.classList.toggle('wysiwyg-fullscreen', this._isFullscreen);
    this.emit('modeChange', { mode: this._isFullscreen ? 'fullscreen' : 'edit' });
  }

  toggleSourceMode(): void {
    this._isSourceMode = !this._isSourceMode;
    if (this._isSourceMode) {
      this._sourceTextarea.value = this.getHTML();
      this.editorEl.style.display = 'none';
      this._sourceTextarea.style.display = '';
    } else {
      const raw = this._sourceTextarea.value;
      const sanitized = (this.options.sanitize !== false)
        ? this._sanitizer.sanitize(raw)
        : raw;
      this.editorEl.innerHTML = sanitized;
      this._history.snapshot();
      this._sourceTextarea.style.display = 'none';
      this.editorEl.style.display = '';
    }
    this.emit('modeChange', { mode: this._isSourceMode ? 'source' : 'edit' });
  }

  exec(command: string, args?: unknown): void {
    this.commands.exec(command, args);
    this.emit('command', { name: command, args });
  }

  queryState(): SelectionState {
    return this.selection.getState();
  }

  registerPlugin(PluginClass: new (editor: Editor) => BasePlugin): void {
    const plugin = new PluginClass(this);
    this._plugins.set(plugin.name, plugin);
    plugin.init();
    const items = plugin.getToolbarItems();
    if (items.length > 0 && this.commands.has('__addToolbarItems')) {
      this.commands.exec('__addToolbarItems', { plugin: plugin.name, items });
    }
  }

  unregisterPlugin(name: string): void {
    const plugin = this._plugins.get(name);
    if (plugin) { plugin.destroy(); this._plugins.delete(name); }
  }

  getPlugin<T extends BasePlugin>(name: string): T | undefined {
    return this._plugins.get(name) as T | undefined;
  }

  getWordCount(): number {
    const text = this.editorEl.innerText?.trim() ?? '';
    if (!text) return 0;
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const SegmenterClass = (Intl as unknown as { Segmenter: new (locale?: string, opts?: { granularity: string }) => { segment(text: string): Iterable<{ isWordLike?: boolean }> } }).Segmenter;
      const segmenter = new SegmenterClass(undefined, { granularity: 'word' });
      return [...segmenter.segment(text)].filter(s => s.isWordLike).length;
    }
    return text.split(/\s+/).filter(Boolean).length;
  }

  getCharCount(): number {
    return (this.editorEl.innerText ?? '').length;
  }

  getReadingTime(): number {
    return Math.max(1, Math.ceil(this.getWordCount() / 200));
  }

  getSelectedText(): string {
    const sel = window.getSelection();
    if (!sel || !this.editorEl.contains(sel.anchorNode)) return '';
    return sel.toString();
  }

  setLocale(locale: 'en' | 'de' | Record<string, string>): void {
    setLocale(locale);
    if (!this.options.placeholder) {
      this.editorEl.setAttribute('data-placeholder', t('placeholder'));
      this.editorEl.setAttribute('aria-label', t('placeholder'));
    }
    this._toolbar?.refreshLocale();
    if (this._isReadonly) this.setReadonly(true);
  }

  setToolbar(toolbar: Toolbar): void {
    this._toolbar = toolbar;
  }

  normalizeColorSpans(): void {
    normalizeColorSpans(this.editorEl);
  }

  getSanitizer(): Sanitizer {
    return this._sanitizer;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._debouncedChange?.cancel();
    this.emit('destroy');
    if (this._autosaveTimer) clearInterval(this._autosaveTimer);
    this._history.destroy();
    this.selection.detach();
    document.removeEventListener('keydown', this._onKeyDown);
    this._plugins.forEach(p => p.destroy());
    this._plugins.clear();
    this.removeAllListeners();
    this.container.innerHTML = '';
  }
}
