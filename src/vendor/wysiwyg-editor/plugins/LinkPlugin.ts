import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { getAncestorWithTag } from '../core/DOMUtils';
import { t } from '../core/i18n';

const BLOCKED_SCHEMES = /^(javascript:|vbscript:|data:)/i;

export class LinkPlugin extends BasePlugin {
  readonly name = 'Link';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    this.registerCommand('insertLink', () => this._openLinkModal());
    this.registerCommand('removeLink', () => {
      document.execCommand('unlink');
      this.editor['_history'].snapshot();
    });

    const kb = (e: KeyboardEvent) => {
      if (!this.editor.wrapperEl.contains(document.activeElement)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this._openLinkModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        document.execCommand('unlink');
      }
    };
    document.addEventListener('keydown', kb);
    this._unsubscribers.push(() => document.removeEventListener('keydown', kb));
  }

  private _openLinkModal(): void {
    this.editor.selection.saveRange();
    const sel = window.getSelection();
    const anchorEl = sel?.anchorNode
      ? getAncestorWithTag(sel.anchorNode, 'A') as HTMLAnchorElement | null
      : null;

    const form = document.createElement('div');
    form.className = 'wysiwyg-form';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = t('urlPlaceholder');
    urlInput.value = anchorEl?.href ?? '';
    urlInput.className = 'wysiwyg-input';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = t('linkText');
    textInput.value = anchorEl?.textContent ?? sel?.toString() ?? '';
    textInput.className = 'wysiwyg-input';

    const newTabLabel = document.createElement('label');
    newTabLabel.className = 'wysiwyg-checkbox-label';
    const newTabCb = document.createElement('input');
    newTabCb.type = 'checkbox';
    newTabCb.checked = anchorEl?.target === '_blank';
    newTabLabel.appendChild(newTabCb);
    newTabLabel.appendChild(document.createTextNode(' ' + t('openInNewTab')));

    const urlRow = this._row(t('urlPlaceholder'), urlInput);
    const textRow = this._row(t('linkText'), textInput);

    form.appendChild(urlRow);
    form.appendChild(textRow);
    form.appendChild(newTabLabel);

    const modal = new Modal({
      title: t('insertLink'),
      content: form,
      onConfirm: () => {
        const url = urlInput.value.trim();
        if (!url || BLOCKED_SCHEMES.test(url)) return;
        const text = textInput.value.trim() || url;
        this.editor.selection.restoreRange();
        this.editor.focus();

        if (anchorEl) {
          anchorEl.href = url;
          anchorEl.textContent = text;
          if (newTabCb.checked) {
            anchorEl.target = '_blank';
            anchorEl.rel = 'noopener noreferrer';
          } else {
            anchorEl.removeAttribute('target');
            anchorEl.removeAttribute('rel');
          }
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.textContent = text;
          if (newTabCb.checked) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
          document.execCommand('insertHTML', false, a.outerHTML);
        }
        this.editor['_history'].snapshot();
      },
      onCancel: () => { this.editor.selection.restoreRange(); },
    });
    modal.open();
    setTimeout(() => urlInput.focus(), 50);
  }

  private _row(label: string, input: HTMLInputElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'wysiwyg-form-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
