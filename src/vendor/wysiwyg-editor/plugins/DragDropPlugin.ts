import { BasePlugin } from './BasePlugin';

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, figure, div.wysiwyg-video-wrapper, hr';

export class DragDropPlugin extends BasePlugin {
  readonly name = 'DragDrop';
  private _dragEl: HTMLElement | null = null;
  private _indicator: HTMLElement | null = null;
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    if (this.editor.options.dragDrop === false) return;
    const observer = new MutationObserver(() => this._attachHandles());
    observer.observe(this.editor.editorEl, { childList: true, subtree: false });
    this._attachHandles();
    this._unsubscribers.push(() => observer.disconnect());
  }

  private _attachHandles(): void {
    const blocks = this.editor.editorEl.querySelectorAll(BLOCK_SELECTOR);
    blocks.forEach(block => {
      const el = block as HTMLElement;
      if (el.dataset.dragHandle) return;
      el.dataset.dragHandle = 'true';
      el.draggable = true;
      el.addEventListener('dragstart', (e) => this._onDragStart(e, el));
      el.addEventListener('dragend', () => this._onDragEnd());
      el.addEventListener('dragover', (e) => this._onDragOver(e, el));
      el.addEventListener('drop', (e) => this._onDrop(e, el));
    });
  }

  private _onDragStart(e: DragEvent, el: HTMLElement): void {
    if ((e.target as HTMLElement).closest('img, table, input')) { e.preventDefault(); return; }
    this._dragEl = el;
    el.classList.add('wysiwyg-dragging');
    e.dataTransfer!.effectAllowed = 'move';

    this._indicator = document.createElement('div');
    this._indicator.className = 'wysiwyg-drop-indicator';
    document.body.appendChild(this._indicator);
  }

  private _onDragEnd(): void {
    this._dragEl?.classList.remove('wysiwyg-dragging');
    this._dragEl = null;
    this._indicator?.remove();
    this._indicator = null;
  }

  private _onDragOver(e: DragEvent, target: HTMLElement): void {
    if (!this._dragEl || target === this._dragEl) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const before = e.clientY < midY;
    if (this._indicator) {
      const top = before ? rect.top + window.scrollY : rect.bottom + window.scrollY;
      this._indicator.style.cssText = `position:absolute;left:${rect.left}px;top:${top}px;width:${rect.width}px;height:2px;background:#3b82f6;pointer-events:none;z-index:9999`;
    }
    target.dataset.dropPosition = before ? 'before' : 'after';
  }

  private _onDrop(e: DragEvent, target: HTMLElement): void {
    if (!this._dragEl || target === this._dragEl) return;
    e.preventDefault();
    const before = target.dataset.dropPosition === 'before';
    delete target.dataset.dropPosition;
    if (before) target.before(this._dragEl);
    else target.after(this._dragEl);
    this.editor['_history'].snapshot();
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
    this._indicator?.remove();
  }
}
