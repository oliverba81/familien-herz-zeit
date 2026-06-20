import { BasePlugin } from './BasePlugin';

export class ListPlugin extends BasePlugin {
  readonly name = 'List';

  init(): void {
    this.registerCommand('bulletList', () => document.execCommand('insertUnorderedList'));
    this.registerCommand('numberedList', () => document.execCommand('insertOrderedList'));
    this.registerCommand('indent', () => document.execCommand('indent'));
    this.registerCommand('outdent', () => document.execCommand('outdent'));
    this.registerCommand('taskList', () => this._insertTaskList());
  }

  private _insertTaskList(): void {
    const ul = document.createElement('ul');
    ul.className = 'wysiwyg-task-list';
    const li = document.createElement('li');
    li.setAttribute('data-checked', 'false');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.setAttribute('contenteditable', 'false');
    cb.addEventListener('change', () => {
      li.setAttribute('data-checked', cb.checked ? 'true' : 'false');
      this.editor['_history'].snapshot();
    });
    const span = document.createElement('span');
    span.textContent = '​';
    li.appendChild(cb);
    li.appendChild(span);
    ul.appendChild(li);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(ul);
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  destroy(): void {}
}
