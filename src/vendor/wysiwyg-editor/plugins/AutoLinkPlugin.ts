import { BasePlugin } from './BasePlugin';
import { getAncestorWithTag } from '../core/DOMUtils';

const URL_REGEX = /^https?:\/\/[^\s]{4,}$/;

export class AutoLinkPlugin extends BasePlugin {
  readonly name = 'AutoLink';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        this._checkAndLink();
      }
    };
    this.editor.editorEl.addEventListener('keydown', handler);
    this._unsubscribers.push(() => this.editor.editorEl.removeEventListener('keydown', handler));
  }

  private _checkAndLink(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (getAncestorWithTag(node, 'A')) return;

    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const before = text.slice(0, offset);
    const words = before.split(/\s/);
    const lastWord = words[words.length - 1];

    if (URL_REGEX.test(lastWord)) {
      const start = offset - lastWord.length;
      const linkRange = document.createRange();
      linkRange.setStart(node, start);
      linkRange.setEnd(node, offset);
      const a = document.createElement('a');
      a.href = lastWord;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = lastWord;
      linkRange.deleteContents();
      linkRange.insertNode(a);
      const newRange = document.createRange();
      newRange.setStartAfter(a);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
