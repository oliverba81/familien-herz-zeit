import { BasePlugin } from './BasePlugin';
import { ColorPicker } from '../ui/ColorPicker';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

const RECENT_KEY = 'wysiwyg-recent-colors';

function getRecentColors(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function addRecentColor(color: string): void {
  const list = [color, ...getRecentColors().filter(c => c !== color)].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export class ColorPlugin extends BasePlugin {
  readonly name = 'Color';
  private _textModal: Modal | null = null;
  private _bgModal: Modal | null = null;

  init(): void {
    this.registerCommand('textColor', () => this._openColorPicker('text'));
    this.registerCommand('bgColor', () => this._openColorPicker('bg'));
  }

  private _openColorPicker(mode: 'text' | 'bg'): void {
    this.editor.selection.saveRange();

    let currentColor = '#000000';
    try {
      currentColor = mode === 'text'
        ? (document.queryCommandValue('foreColor') || '#000000')
        : (document.queryCommandValue('hiliteColor') || '#ffffff');
    } catch { /* ignore */ }

    const picker = new ColorPicker(currentColor, getRecentColors());
    const modal = new Modal({
      title: mode === 'text' ? t('textColor') : t('highlightColor'),
      content: picker.element,
      onConfirm: () => {
        const color = picker.getValue();
        addRecentColor(color);
        this.editor.focus();
        this.editor.selection.restoreRange();
        if (mode === 'text') {
          document.execCommand('foreColor', false, color);
          this.editor.normalizeColorSpans();
        } else {
          document.execCommand('hiliteColor', false, color);
        }
        this.editor['_history'].snapshot();
      },
      onCancel: () => { this.editor.selection.restoreRange(); },
    });

    if (mode === 'text') this._textModal = modal;
    else this._bgModal = modal;

    modal.open();
  }

  destroy(): void {
    this._textModal?.close();
    this._bgModal?.close();
  }
}
