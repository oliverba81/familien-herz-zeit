import type { Editor } from '../core/Editor';
import type { SelectionState, ToolbarItemConfig } from '../core/types';
import { DEFAULT_TOOLBAR } from './toolbarConfig';
import { resolveIcons } from './icons';
import { t } from '../core/i18n';

export class Toolbar {
  private _editor: Editor;
  private _icons: Record<string, string>;
  private _buttons = new Map<string, HTMLButtonElement>();

  constructor(editor: Editor) {
    this._editor = editor;
    this._icons = resolveIcons(editor.options.icons);
    this._build();
    this._subscribeToState();
  }

  refreshLocale(): void {
    this._buttons.clear();
    this._editor.toolbarEl.innerHTML = '';
    this._build();
  }

  private _build(): void {
    const groups = (this._editor.options.toolbar !== false && this._editor.options.toolbar)
      ? this._editor.options.toolbar
      : DEFAULT_TOOLBAR;

    groups.forEach((group, idx) => {
      if (idx > 0) {
        const sep = document.createElement('div');
        sep.className = 'wysiwyg-separator';
        sep.setAttribute('role', 'separator');
        this._editor.toolbarEl.appendChild(sep);
      }

      const groupEl = document.createElement('div');
      groupEl.className = 'wysiwyg-btn-group';
      group.forEach(item => {
        const el = this._createItem(item);
        if (el) groupEl.appendChild(el);
      });
      this._editor.toolbarEl.appendChild(groupEl);
    });
  }

  private _createItem(item: ToolbarItemConfig): HTMLElement | null {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'wysiwyg-separator';
      return sep;
    }

    if (item.type === 'dropdown') {
      return this._createDropdown(item);
    }

    if (item.type === 'button' || item.type === 'color') {
      return this._createButton(item);
    }

    return null;
  }

  private _createButton(item: ToolbarItemConfig): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'wysiwyg-btn';
    btn.setAttribute('aria-label', t(item.label ?? item.command ?? ''));
    btn.title = t(item.label ?? item.command ?? '');
    btn.setAttribute('aria-pressed', 'false');
    btn.type = 'button';

    if (item.icon && this._icons[item.icon]) {
      btn.innerHTML = this._icons[item.icon];
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
      }
    } else {
      btn.textContent = t(item.label ?? item.command ?? '');
    }

    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      if (item.command && this._editor.commands.has(item.command)) {
        this._editor.commands.exec(item.command);
      }
    });

    if (item.command) this._buttons.set(item.command, btn);
    return btn;
  }

  private _createDropdown(item: ToolbarItemConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'wysiwyg-dropdown-wrapper';

    const select = document.createElement('select');
    select.className = 'wysiwyg-select';
    select.setAttribute('aria-label', t(item.label ?? ''));
    select.title = t(item.label ?? '');

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t(item.label ?? '');
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    item.options?.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = this._translateOption(item, opt);
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const value = select.value;
      if (!value) return;

      if (item.command === 'setBlockType') {
        if (this._editor.commands.has(value)) this._editor.commands.exec(value);
      } else if (item.command && this._editor.commands.has(item.command)) {
        this._editor.commands.exec(item.command, value);
      }

      this._editor.focus();
      setTimeout(() => {
        select.selectedIndex = 0;
        placeholder.selected = true;
      }, 100);
    });

    select.addEventListener('mousedown', () => this._editor.selection.saveRange());

    wrapper.appendChild(select);
    return wrapper;
  }

  private _translateOption(item: ToolbarItemConfig, opt: { value: string; label: string }): string {
    if (item.command !== 'setBlockType') return opt.label;

    const labelKeys: Record<string, string> = {
      format_p: 'paragraph',
      format_h1: 'heading1',
      format_h2: 'heading2',
      format_h3: 'heading3',
      format_h4: 'heading4',
      format_h5: 'heading5',
      format_h6: 'heading6',
      format_blockquote: 'blockquote',
      format_pre: 'codeBlock',
    };

    return t(labelKeys[opt.value] ?? opt.label);
  }

  private _subscribeToState(): void {
    this._editor.on('selectionChange', (state: SelectionState) => {
      this._buttons.forEach((btn, command) => {
        const item = this._findItem(command);
        if (item?.stateKey) {
          const active = !!(state[item.stateKey]);
          btn.setAttribute('aria-pressed', String(active));
          btn.classList.toggle('wysiwyg-btn--active', active);
        }
      });

      const undoBtn = this._buttons.get('undo');
      const redoBtn = this._buttons.get('redo');
      if (undoBtn) undoBtn.disabled = !state.canUndo;
      if (redoBtn) redoBtn.disabled = !state.canRedo;
    });
  }

  private _findItem(command: string): ToolbarItemConfig | undefined {
    const groups = (this._editor.options.toolbar !== false && this._editor.options.toolbar)
      ? this._editor.options.toolbar
      : DEFAULT_TOOLBAR;
    for (const group of groups) {
      const found = group.find(item => item.command === command);
      if (found) return found;
    }
    return undefined;
  }
}
