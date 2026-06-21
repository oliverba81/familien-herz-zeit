import { BasePlugin } from './BasePlugin';
import { t } from '../core/i18n';

export class WordCountPlugin extends BasePlugin {
  readonly name = 'WordCount';
  private _bar: HTMLElement | null = null;
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    this._bar = this.editor['_statusBar'];
    this._bar.setAttribute('aria-live', 'polite');
    this._bar.className = 'wysiwyg-word-count-bar';
    this._update();

    const handler = () => this._update();
    const unsub = this.editor.on('change', handler);
    this._unsubscribers.push(unsub);

    const unsub2 = this.editor.on('selectionChange', handler);
    this._unsubscribers.push(unsub2);
  }

  private _update(): void {
    if (!this._bar) return;
    const words = this.editor.getWordCount();
    const chars = this.editor.getCharCount();
    const readingTime = this.editor.getReadingTime();
    const maxLen = this.editor.options.maxLength;

    let text = `${words} ${t('wordCount')} · ${chars} ${t('charCount')} · ~${readingTime} ${t('readingTime')}`;
    if (maxLen) {
      text = `${chars} / ${maxLen} ${t('charCount')} · ${words} ${t('wordCount')} · ~${readingTime} ${t('readingTime')}`;
      const ratio = chars / maxLen;
      this._bar.classList.toggle('wysiwyg-limit-warning', ratio >= 0.9);
    }
    this._bar.textContent = text;
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
