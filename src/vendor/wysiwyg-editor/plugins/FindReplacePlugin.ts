import { BasePlugin } from './BasePlugin';
import { t } from '../core/i18n';

export class FindReplacePlugin extends BasePlugin {
  readonly name = 'FindReplace';
  private _dialog: HTMLElement | null = null;
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    this.registerCommand('findReplace', () => this._toggle());

    const kb = (e: KeyboardEvent) => {
      if (!this.editor.wrapperEl.contains(document.activeElement) && !this._dialog) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this._toggle();
      }
      if (e.key === 'Escape' && this._dialog) {
        this._close();
      }
    };
    document.addEventListener('keydown', kb);
    this._unsubscribers.push(() => document.removeEventListener('keydown', kb));
  }

  private _toggle(): void {
    if (this._dialog) this._close();
    else this._open();
  }

  private _open(): void {
    const dialog = document.createElement('div');
    dialog.className = 'wysiwyg-find-replace';

    const findInput = document.createElement('input');
    findInput.type = 'text';
    findInput.placeholder = t('findPlaceholder');
    findInput.className = 'wysiwyg-input';

    const replaceInput = document.createElement('input');
    replaceInput.type = 'text';
    replaceInput.placeholder = t('replacePlaceholder');
    replaceInput.className = 'wysiwyg-input';

    const countEl = document.createElement('span');
    countEl.className = 'wysiwyg-find-count';

    const replaceBtn = document.createElement('button');
    replaceBtn.textContent = t('replaceBtn');
    replaceBtn.className = 'wysiwyg-btn wysiwyg-btn-primary';

    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.textContent = t('replaceAllBtn');
    replaceAllBtn.className = 'wysiwyg-btn wysiwyg-btn-primary';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'wysiwyg-btn';
    closeBtn.title = t('cancelBtn');

    findInput.addEventListener('input', () => {
      const count = this._countMatches(findInput.value);
      countEl.textContent = findInput.value ? `${count} ${count === 1 ? 'match' : 'matches'}` : '';
    });

    replaceBtn.addEventListener('click', () => {
      this._replaceNext(findInput.value, replaceInput.value);
    });
    replaceAllBtn.addEventListener('click', () => {
      const count = this._replaceAll(findInput.value, replaceInput.value);
      countEl.textContent = `Replaced ${count}`;
    });
    closeBtn.addEventListener('click', () => this._close());

    dialog.appendChild(findInput);
    dialog.appendChild(replaceInput);
    dialog.appendChild(countEl);
    dialog.appendChild(replaceBtn);
    dialog.appendChild(replaceAllBtn);
    dialog.appendChild(closeBtn);

    this.editor.wrapperEl.appendChild(dialog);
    this._dialog = dialog;
    setTimeout(() => findInput.focus(), 50);
  }

  private _close(): void {
    this._dialog?.remove();
    this._dialog = null;
  }

  private _countMatches(text: string): number {
    if (!text) return 0;
    const content = this.editor.editorEl.innerHTML;
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (content.match(new RegExp(escaped, 'gi')) ?? []).length;
  }

  private _replaceNext(find: string, replace: string): void {
    if (!find) return;
    const html = this.editor.editorEl.innerHTML;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const newHtml = html.replace(new RegExp(escaped, 'i'), replace);
    if (newHtml !== html) {
      this.editor.editorEl.innerHTML = newHtml;
      this.editor['_history'].snapshot();
    }
  }

  private _replaceAll(find: string, replace: string): number {
    if (!find) return 0;
    const html = this.editor.editorEl.innerHTML;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const count = (html.match(regex) ?? []).length;
    const newHtml = html.replace(regex, replace);
    if (newHtml !== html) {
      this.editor.editorEl.innerHTML = newHtml;
      this.editor['_history'].snapshot();
    }
    return count;
  }

  destroy(): void {
    this._close();
    this._unsubscribers.forEach(fn => fn());
  }
}
