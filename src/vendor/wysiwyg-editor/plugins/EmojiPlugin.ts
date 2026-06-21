import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

const EMOJIS = [
  '😀','😂','😍','😎','🤔','😢','😡','🥳','🤩','😴','😇','🤣','😅','😊','😏',
  '👋','👍','👎','✌️','🤝','👏','🙌','💪','🤦','🤷','👀','💯','🔥','✨','🎉',
  '🐶','🐱','🦊','🐼','🐨','🦁','🐸','🦋','🐝','🦄','🐬','🦅',
  '🍕','🍔','🍟','🌮','🍜','🍣','🍰','🎂','☕','🍺','🍎','🥑',
  '🚗','✈️','🚂','🚀','🏖️','🗺️','🏔️','🗼','🌍','🏠',
  '💻','📱','📷','🎮','📚','💡','🔑','✂️','🎸','🎵',
  '❤️','🧡','💚','💙','💜','⭐','🌟','✨','❗','✅','❌','⚡',
];

export class EmojiPlugin extends BasePlugin {
  readonly name = 'Emoji';

  init(): void {
    this.registerCommand('insertEmoji', () => this._openPicker());
  }

  private _openPicker(): void {
    this.editor.selection.saveRange();
    const grid = document.createElement('div');
    grid.className = 'wysiwyg-emoji-grid';

    let modal: Modal;
    EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'wysiwyg-emoji-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        this.editor.selection.restoreRange();
        this.editor.focus();
        document.execCommand('insertText', false, emoji);
        modal.close();
      });
      grid.appendChild(btn);
    });

    modal = new Modal({ title: t('insertEmoji'), content: grid, showConfirm: false });
    modal.open();
  }

  destroy(): void {}
}
