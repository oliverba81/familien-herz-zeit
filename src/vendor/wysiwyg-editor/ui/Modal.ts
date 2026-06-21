import { t } from '../core/i18n';

interface ModalOptions {
  title: string;
  content: HTMLElement;
  onConfirm?: () => void;
  onCancel?: () => void;
  showConfirm?: boolean;
}

export class Modal {
  private _overlay: HTMLElement;
  private _dialog!: HTMLElement;
  private _options: ModalOptions;

  constructor(options: ModalOptions) {
    this._options = options;
    this._overlay = this._build();
  }

  private _build(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'wysiwyg-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    this._dialog = document.createElement('div');
    this._dialog.className = 'wysiwyg-modal';

    const header = document.createElement('div');
    header.className = 'wysiwyg-modal-header';
    const title = document.createElement('h3');
    title.textContent = this._options.title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'wysiwyg-modal-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', t('cancelBtn'));
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'wysiwyg-modal-body';
    body.appendChild(this._options.content);

    this._dialog.appendChild(header);
    this._dialog.appendChild(body);

    if (this._options.showConfirm !== false) {
      const footer = document.createElement('div');
      footer.className = 'wysiwyg-modal-footer';

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'wysiwyg-btn wysiwyg-btn-primary';
      confirmBtn.textContent = t('insertBtn');
      confirmBtn.addEventListener('click', () => {
        this._options.onConfirm?.();
        this.close();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'wysiwyg-btn';
      cancelBtn.textContent = t('cancelBtn');
      cancelBtn.addEventListener('click', () => this.close());

      footer.appendChild(confirmBtn);
      footer.appendChild(cancelBtn);
      this._dialog.appendChild(footer);
    }

    overlay.appendChild(this._dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', onKey);
    (overlay as unknown as { _keyListener: typeof onKey })._keyListener = onKey;

    return overlay;
  }

  open(): void {
    document.body.appendChild(this._overlay);
    setTimeout(() => {
      const input = this._dialog.querySelector('input, textarea, button:not(.wysiwyg-modal-close)') as HTMLElement | null;
      input?.focus();
    }, 50);
  }

  close(): void {
    this._options.onCancel?.();
    const listener = (this._overlay as unknown as { _keyListener?: (e: KeyboardEvent) => void })._keyListener;
    if (listener) document.removeEventListener('keydown', listener);
    this._overlay.remove();
  }
}
