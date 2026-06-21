import { BasePlugin } from './BasePlugin';

export class ParagraphPlugin extends BasePlugin {
  readonly name = 'Paragraph';

  init(): void {
    const blocks = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    blocks.forEach(tag => {
      this.registerCommand(`format_${tag}`, () => {
        document.execCommand('formatBlock', false, tag);
      });
    });
    this.registerCommand('format_pre', () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const range = sel.getRangeAt(0);
      const text = range.toString() || 'code here';
      code.textContent = text;
      pre.appendChild(code);
      range.deleteContents();
      range.insertNode(pre);
      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(newRange);
    });
    this.registerCommand('insertHR', () => {
      document.execCommand('insertHorizontalRule');
    });
  }

  destroy(): void {}
}
