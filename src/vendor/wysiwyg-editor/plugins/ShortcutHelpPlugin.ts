import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

const SHORTCUTS = [
  ['Ctrl+B', 'Bold'], ['Ctrl+I', 'Italic'], ['Ctrl+U', 'Underline'],
  ['Ctrl+Shift+S', 'Strikethrough'], ['Ctrl+Z', 'Undo'], ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
  ['Ctrl+K', 'Insert Link'], ['Ctrl+Shift+K', 'Remove Link'],
  ['Ctrl+Shift+F', 'Find & Replace'], ['Ctrl+A', 'Select All (in editor)'],
  ['Ctrl+/', 'Show Shortcuts'], ['Ctrl+Shift+V', 'Paste as plain text'],
  ['Ctrl+P', 'Print'], ['F11', 'Fullscreen'],
  ['Tab (in list)', 'Indent'], ['Shift+Tab (in list)', 'Outdent'],
  ['Tab (no context)', '4 spaces'], ['Shift+Enter', 'Line break (no new paragraph)'],
  ['/ (line start)', 'Slash command palette'],
];

export class ShortcutHelpPlugin extends BasePlugin {
  readonly name = 'ShortcutHelp';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    this.registerCommand('showShortcuts', () => this._show());

    const kb = (e: KeyboardEvent) => {
      if (!this.editor.wrapperEl.contains(document.activeElement)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this._show();
      }
    };
    document.addEventListener('keydown', kb);
    this._unsubscribers.push(() => document.removeEventListener('keydown', kb));
  }

  private _show(): void {
    const table = document.createElement('table');
    table.className = 'wysiwyg-shortcut-table';
    const tbody = document.createElement('tbody');
    SHORTCUTS.forEach(([key, desc]) => {
      const tr = document.createElement('tr');
      const tdKey = document.createElement('td');
      tdKey.innerHTML = `<kbd>${key}</kbd>`;
      const tdDesc = document.createElement('td');
      tdDesc.textContent = desc;
      tr.appendChild(tdKey);
      tr.appendChild(tdDesc);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const modal = new Modal({ title: t('shortcutHelp'), content: table, showConfirm: false });
    modal.open();
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
