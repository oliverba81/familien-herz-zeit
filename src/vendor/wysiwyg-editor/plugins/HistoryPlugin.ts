import { BasePlugin } from './BasePlugin';

export class HistoryPlugin extends BasePlugin {
  readonly name = 'History';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    this.registerCommand('undo', () => {
      this.editor['_history'].undo();
      this.editor['_updatePlaceholder']();
    });
    this.registerCommand('redo', () => {
      this.editor['_history'].redo();
      this.editor['_updatePlaceholder']();
    });

    const kb = (e: KeyboardEvent) => {
      if (!this.editor.wrapperEl.contains(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.editor['_history'].undo();
          this.editor['_updatePlaceholder']();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.editor['_history'].redo();
          this.editor['_updatePlaceholder']();
        }
      }
    };
    document.addEventListener('keydown', kb);
    this._unsubscribers.push(() => document.removeEventListener('keydown', kb));
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
  }
}
