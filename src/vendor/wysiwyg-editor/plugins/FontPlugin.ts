import { BasePlugin } from './BasePlugin';

export class FontPlugin extends BasePlugin {
  readonly name = 'Font';

  init(): void {
    this.registerCommand('setFontFamily', (args) => {
      document.execCommand('fontName', false, args as string);
    });
    this.registerCommand('setFontSize', (args) => {
      const size = args as string;
      document.execCommand('fontSize', false, '7');
      const fontEls = this.editor.editorEl.querySelectorAll('font[size="7"]');
      fontEls.forEach(el => {
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
      });
    });
  }

  destroy(): void {}
}
