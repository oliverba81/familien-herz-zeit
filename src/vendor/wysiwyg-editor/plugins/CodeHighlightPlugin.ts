import { BasePlugin } from './BasePlugin';

declare global {
  interface Window {
    hljs?: { highlightElement(el: HTMLElement): void };
  }
}

export class CodeHighlightPlugin extends BasePlugin {
  readonly name = 'CodeHighlight';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    if (!this.editor.options.codeHighlight) return;

    const unsub = this.editor.on('change', () => this._highlightAll());
    this._unsubscribers.push(unsub);
    this._highlightAll();
  }

  private _highlightAll(): void {
    if (!window.hljs) return;
    this.editor.editorEl.querySelectorAll('pre code').forEach(el => {
      window.hljs!.highlightElement(el as HTMLElement);
    });
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
