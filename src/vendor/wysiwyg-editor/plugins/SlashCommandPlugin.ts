import { BasePlugin } from './BasePlugin';

interface SlashCommand {
  label: string;
  description: string;
  command: string;
  args?: unknown;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: 'Paragraph', description: 'Text paragraph', command: 'format_p' },
  { label: 'Heading 1', description: 'Large heading', command: 'format_h1' },
  { label: 'Heading 2', description: 'Medium heading', command: 'format_h2' },
  { label: 'Heading 3', description: 'Small heading', command: 'format_h3' },
  { label: 'Blockquote', description: 'Quote block', command: 'format_blockquote' },
  { label: 'Code Block', description: 'Code snippet', command: 'format_pre' },
  { label: 'Divider', description: 'Horizontal rule', command: 'insertHR' },
  { label: 'Image', description: 'Insert image', command: 'insertImage' },
  { label: 'Table', description: 'Insert table', command: 'insertTable' },
  { label: 'Task List', description: 'Checkbox list', command: 'taskList' },
  { label: 'Video', description: 'Embed video', command: 'insertVideo' },
  { label: 'Bullet List', description: 'Unordered list', command: 'bulletList' },
  { label: 'Numbered List', description: 'Ordered list', command: 'numberedList' },
];

export class SlashCommandPlugin extends BasePlugin {
  readonly name = 'SlashCommand';
  private _menu: HTMLElement | null = null;
  private _filtered: SlashCommand[] = [];
  private _activeIdx = 0;
  private _query = '';
  private _unsubscribers: Array<() => void> = [];

  init(): void {
    const onInput = (e: Event) => this._onInput(e as InputEvent);
    const onKeyDown = (e: KeyboardEvent) => this._onKeyDown(e);
    this.editor.editorEl.addEventListener('input', onInput);
    this.editor.editorEl.addEventListener('keydown', onKeyDown);
    this._unsubscribers.push(() => {
      this.editor.editorEl.removeEventListener('input', onInput);
      this.editor.editorEl.removeEventListener('keydown', onKeyDown);
    });

    document.addEventListener('click', (e) => {
      if (!this._menu?.contains(e.target as Node)) this._close();
    });
  }

  private _onInput(_e: InputEvent): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const lineText = text.slice(0, offset);

    const slashIdx = lineText.lastIndexOf('/');
    if (slashIdx >= 0 && (slashIdx === 0 || /\s/.test(lineText[slashIdx - 1]))) {
      this._query = lineText.slice(slashIdx + 1);
      this._showMenu(range);
    } else {
      this._close();
    }
  }

  private _showMenu(range: Range): void {
    this._filtered = SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(this._query.toLowerCase())
    );
    this._activeIdx = 0;

    if (!this._menu) {
      this._menu = document.createElement('div');
      this._menu.className = 'wysiwyg-slash-menu';
      this._menu.setAttribute('role', 'listbox');
      document.body.appendChild(this._menu);
    }

    this._renderMenu();

    const rect = range.getBoundingClientRect();
    this._menu.style.position = 'fixed';
    this._menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    this._menu.style.left = `${rect.left + window.scrollX}px`;
    this._menu.style.display = 'block';
  }

  private _renderMenu(): void {
    if (!this._menu) return;
    this._menu.innerHTML = '';
    this._filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = 'wysiwyg-slash-item' + (idx === this._activeIdx ? ' wysiwyg-slash-item--active' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', idx === this._activeIdx ? 'true' : 'false');
      const label = document.createElement('strong');
      label.textContent = cmd.label;
      const desc = document.createElement('span');
      desc.textContent = cmd.description;
      item.appendChild(label);
      item.appendChild(desc);
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._execute(cmd);
      });
      this._menu!.appendChild(item);
    });
  }

  private _onKeyDown(e: KeyboardEvent): void {
    if (!this._menu || this._menu.style.display === 'none') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._activeIdx = (this._activeIdx + 1) % this._filtered.length;
      this._renderMenu();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._activeIdx = (this._activeIdx - 1 + this._filtered.length) % this._filtered.length;
      this._renderMenu();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this._filtered[this._activeIdx]) this._execute(this._filtered[this._activeIdx]);
    } else if (e.key === 'Escape') {
      this._close();
    }
  }

  private _execute(cmd: SlashCommand): void {
    this._removeSlashText();
    this._close();
    if (this.editor.commands.has(cmd.command)) {
      this.editor.commands.exec(cmd.command, cmd.args);
    }
    this.editor['_history'].snapshot();
  }

  private _removeSlashText(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const slashIdx = text.lastIndexOf('/', offset);
    if (slashIdx >= 0) {
      node.textContent = text.slice(0, slashIdx) + text.slice(offset);
      const newRange = document.createRange();
      newRange.setStart(node, slashIdx);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  private _close(): void {
    if (this._menu) this._menu.style.display = 'none';
  }

  destroy(): void {
    this._unsubscribers.forEach(fn => fn());
    this._menu?.remove();
  }
}
