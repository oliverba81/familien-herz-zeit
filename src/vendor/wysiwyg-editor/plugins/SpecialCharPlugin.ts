import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

const CHARS = [
  '«','»','“','”','‘','’','…','—','–','‐',
  '©','®','™','°','±','×','÷','≠','≈','∞',
  '€','£','¥','¢','₹','₿','₽',
  'α','β','γ','δ','π','σ','φ','Σ','√','∫',
  '→','←','↑','↓','↔','↕','⇒','⇐','⟹',
  '♠','♣','♥','♦','★','☆','✓','✗','•','‣',
];

export class SpecialCharPlugin extends BasePlugin {
  readonly name = 'SpecialChar';

  init(): void {
    this.registerCommand('specialChars', () => this._openPicker());
  }

  private _openPicker(): void {
    this.editor.selection.saveRange();
    const grid = document.createElement('div');
    grid.className = 'wysiwyg-char-grid';

    let modal: Modal;
    CHARS.forEach(char => {
      const btn = document.createElement('button');
      btn.className = 'wysiwyg-char-btn';
      btn.textContent = char;
      btn.title = `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`;
      btn.addEventListener('click', () => {
        this.editor.selection.restoreRange();
        this.editor.focus();
        document.execCommand('insertText', false, char);
        modal.close();
      });
      grid.appendChild(btn);
    });

    modal = new Modal({ title: t('specialChars'), content: grid, showConfirm: false });
    modal.open();
  }

  destroy(): void {}
}
