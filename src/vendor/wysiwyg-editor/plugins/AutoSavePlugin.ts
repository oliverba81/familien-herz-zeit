import { BasePlugin } from './BasePlugin';
import { t } from '../core/i18n';

export class AutoSavePlugin extends BasePlugin {
  readonly name = 'AutoSave';
  private _banner: HTMLElement | null = null;

  init(): void {
    const opts = this.editor.options.autosave;
    if (!opts?.enabled) return;

    const key = opts.storageKey ?? 'wysiwyg-autosave';
    const saved = localStorage.getItem(key);
    if (saved && saved !== '<p><br></p>' && saved !== '') {
      this._showRecoveryBanner(saved, key);
    }

    this._unsub = this.editor.on('autosave', () => {
      // triggered by Editor._startAutosave
    });
  }

  private _unsub: (() => void) | null = null;

  private _showRecoveryBanner(saved: string, key: string): void {
    const banner = document.createElement('div');
    banner.className = 'wysiwyg-autosave-banner';
    banner.setAttribute('aria-live', 'assertive');

    const msg = document.createElement('span');
    msg.textContent = t('autosaveRestoreMsg');

    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = t('restoreBtn');
    restoreBtn.className = 'wysiwyg-btn wysiwyg-btn-primary';
    restoreBtn.addEventListener('click', () => {
      this.editor.setHTML(saved);
      banner.remove();
      this._banner = null;
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = t('dismissBtn');
    dismissBtn.className = 'wysiwyg-btn';
    dismissBtn.addEventListener('click', () => {
      localStorage.removeItem(key);
      banner.remove();
      this._banner = null;
    });

    banner.appendChild(msg);
    banner.appendChild(restoreBtn);
    banner.appendChild(dismissBtn);
    this.editor.wrapperEl.insertBefore(banner, this.editor.wrapperEl.firstChild);
    this._banner = banner;
  }

  destroy(): void {
    this._unsub?.();
    this._banner?.remove();
  }
}
