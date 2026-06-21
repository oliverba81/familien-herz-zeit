import { BasePlugin } from './BasePlugin';

export class FloatingToolbarPlugin extends BasePlugin {
  readonly name = 'FloatingToolbar';
  private _toolbar: HTMLElement | null = null;
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    if (this.editor.options.floatingToolbar === false) return;
    this._toolbar = this._createToolbar();
    document.body.appendChild(this._toolbar);

    const onMouseUp = () => setTimeout(() => this._update(), 10);
    document.addEventListener('mouseup', onMouseUp);
    this._unsubscribers.push(() => document.removeEventListener('mouseup', onMouseUp));

    const onMouseDown = (e: MouseEvent) => {
      if (!this._toolbar?.contains(e.target as Node)) {
        // hide on click outside
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    this._unsubscribers.push(() => document.removeEventListener('mousedown', onMouseDown));

    const unsub = this.editor.on('selectionChange', (state) => {
      if (state.isCollapsed || !state.selectedText) {
        this._hide();
      }
    });
    this._unsubscribers.push(unsub);
  }

  private _createToolbar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'wysiwyg-floating-toolbar';
    bar.style.display = 'none';

    const cmds = [
      { cmd: 'bold', icon: 'B', label: 'Bold' },
      { cmd: 'italic', icon: 'I', label: 'Italic' },
      { cmd: 'underline', icon: 'U', label: 'Underline' },
      { cmd: 'insertLink', icon: '🔗', label: 'Link' },
      { cmd: 'inlineCode', icon: '</>', label: 'Code' },
    ];

    cmds.forEach(({ cmd, icon, label }) => {
      const btn = document.createElement('button');
      btn.className = 'wysiwyg-btn';
      btn.innerHTML = icon;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (this.editor.commands.has(cmd)) this.editor.commands.exec(cmd);
      });
      bar.appendChild(btn);
    });

    return bar;
  }

  private _update(): void {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { this._hide(); return; }
    if (!this.editor.editorEl.contains(sel.anchorNode)) { this._hide(); return; }

    const range = sel.getRangeAt(0);
    const rects = range.getClientRects();
    if (!rects.length) { this._hide(); return; }
    const firstRect = rects[0];
    const toolbarH = this._toolbar!.offsetHeight || 36;
    const top = firstRect.top + window.scrollY - toolbarH - 8;
    const left = firstRect.left + window.scrollX + firstRect.width / 2;

    this._toolbar!.style.display = 'flex';
    this._toolbar!.style.top = `${top}px`;
    this._toolbar!.style.left = `${left}px`;
    this._toolbar!.style.transform = 'translateX(-50%)';
  }

  private _hide(): void {
    if (this._toolbar) this._toolbar.style.display = 'none';
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
    this._toolbar?.remove();
  }
}
