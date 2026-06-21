import { debounce } from './utils';

interface Snapshot {
  html: string;
  path: number[];
  offset: number;
}

export class History {
  private _editorEl: HTMLElement;
  private _snapshots: Snapshot[] = [];
  private _index = -1;
  private _observer: MutationObserver;
  private _paused = false;
  private _limit: number;
  private _onChange: (canUndo: boolean, canRedo: boolean) => void;

  debouncedSnapshot: () => void;

  constructor(
    editorEl: HTMLElement,
    limit: number,
    onChange: (canUndo: boolean, canRedo: boolean) => void
  ) {
    this._editorEl = editorEl;
    this._limit = limit;
    this._onChange = onChange;
    this._observer = new MutationObserver(() => {
      if (!this._paused) this.debouncedSnapshot();
    });
    this.debouncedSnapshot = debounce(() => this.snapshot(), 500);
  }

  attach(): void {
    this._observer.observe(this._editorEl, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  }

  snapshot(): void {
    const html = this._editorEl.innerHTML;
    if (this._index >= 0 && this._snapshots[this._index].html === html) return;

    this._snapshots = this._snapshots.slice(0, this._index + 1);
    const snap: Snapshot = { html, path: this._getCursorPath(), offset: this._getCursorOffset() };
    this._snapshots.push(snap);
    if (this._snapshots.length > this._limit) this._snapshots.shift();
    this._index = this._snapshots.length - 1;
    this._notify();
  }

  undo(): boolean {
    if (this._index <= 0) return false;
    this._index--;
    this._restore();
    return true;
  }

  redo(): boolean {
    if (this._index >= this._snapshots.length - 1) return false;
    this._index++;
    this._restore();
    return true;
  }

  get canUndo(): boolean { return this._index > 0; }
  get canRedo(): boolean { return this._index < this._snapshots.length - 1; }

  private _restore(): void {
    const snap = this._snapshots[this._index];
    this._paused = true;
    this._observer.disconnect();
    this._editorEl.innerHTML = snap.html;
    this._restoreCursor(snap.path, snap.offset);
    this._observer.observe(this._editorEl, {
      subtree: true, childList: true, characterData: true, attributes: true,
    });
    this._paused = false;
    this._notify();
  }

  private _notify(): void {
    this._onChange(this.canUndo, this.canRedo);
  }

  private _getCursorPath(): number[] {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);
    return this._getNodePath(range.startContainer);
  }

  private _getCursorOffset(): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    return sel.getRangeAt(0).startOffset;
  }

  private _getNodePath(node: Node): number[] {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== this._editorEl) {
      const p: Node | null = current.parentNode;
      if (!p) break;
      path.unshift(Array.from(p.childNodes).indexOf(current as ChildNode));
      current = p;
    }
    return path;
  }

  private _restoreCursor(path: number[], offset: number): void {
    try {
      let node: Node = this._editorEl;
      for (const idx of path) {
        if (!node.childNodes[idx]) return;
        node = node.childNodes[idx];
      }
      const range = document.createRange();
      range.setStart(node, Math.min(offset, node.textContent?.length ?? 0));
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // ignore cursor restoration errors
    }
  }

  destroy(): void {
    this._observer.disconnect();
    (this.debouncedSnapshot as ReturnType<typeof debounce>).cancel?.();
  }
}
