import { BasePlugin } from './BasePlugin';
import { t } from '../core/i18n';

export class TablePlugin extends BasePlugin {
  readonly name = 'Table';
  private _floatingToolbar: HTMLElement | null = null;
  private _activeTable: HTMLTableElement | null = null;
  private _listeners: Array<() => void> = [];

  init(): void {
    this.registerCommand('insertTable', (args) => {
      const { rows = 3, cols = 3 } = (args as { rows?: number; cols?: number }) ?? {};
      this._insertTable(rows, cols);
    });
    this.registerCommand('tableTabNext', (args) => {
      const { shift } = (args as { shift?: boolean }) ?? {};
      this._tableTabNav(shift ?? false);
    });

    const editorEl = this.editor.editorEl;
    const onClick = (e: Event) => this._onEditorClick(e as MouseEvent);
    editorEl.addEventListener('click', onClick);
    this._listeners.push(() => editorEl.removeEventListener('click', onClick));

    const onScroll = () => this._repositionToolbar();
    document.addEventListener('scroll', onScroll, true);
    this._listeners.push(() => document.removeEventListener('scroll', onScroll, true));

    document.addEventListener('click', (e) => {
      if (!this._activeTable?.contains(e.target as Node) &&
          !this._floatingToolbar?.contains(e.target as Node)) {
        this._hideToolbar();
      }
    });
  }

  private _insertTable(rows: number, cols: number): void {
    const table = document.createElement('table');
    table.className = 'wysiwyg-table';
    const colgroup = document.createElement('colgroup');
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('col');
      col.style.width = `${Math.floor(100 / cols)}%`;
      colgroup.appendChild(col);
    }
    table.appendChild(colgroup);
    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '<br>';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let block = range.commonAncestorContainer as HTMLElement;
      if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!;
      while (block.parentElement && block.parentElement !== this.editor.editorEl) {
        block = block.parentElement;
      }
      block.after(table);
    } else {
      this.editor.editorEl.appendChild(table);
    }

    const firstTd = table.querySelector('td');
    if (firstTd) {
      const range = document.createRange();
      range.setStart(firstTd, 0);
      const sel2 = window.getSelection()!;
      sel2.removeAllRanges();
      sel2.addRange(range);
    }
    this.editor['_history'].snapshot();
  }

  private _onEditorClick(e: MouseEvent): void {
    const td = (e.target as Element).closest('td, th') as HTMLElement | null;
    const table = td?.closest('table') as HTMLTableElement | null;
    if (table) {
      this._activeTable = table;
      this._showToolbar(table);
    }
  }

  private _showToolbar(table: HTMLTableElement): void {
    if (!this._floatingToolbar) {
      this._floatingToolbar = this._createToolbar();
      document.body.appendChild(this._floatingToolbar);
    }
    this._repositionToolbar();
    this._floatingToolbar.style.display = 'flex';
    this._activeTable = table;
  }

  private _hideToolbar(): void {
    if (this._floatingToolbar) this._floatingToolbar.style.display = 'none';
    this._activeTable = null;
  }

  private _repositionToolbar(): void {
    if (!this._floatingToolbar || !this._activeTable) return;
    const rect = this._activeTable.getBoundingClientRect();
    this._floatingToolbar.style.position = 'fixed';
    this._floatingToolbar.style.top = `${rect.top - 44}px`;
    this._floatingToolbar.style.left = `${rect.left}px`;
    this._floatingToolbar.style.zIndex = 'var(--wysiwyg-z-table-toolbar, 9100)';
  }

  private _createToolbar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'wysiwyg-table-toolbar';
    const buttons: Array<{ label: string; title: string; action: () => void }> = [
      { label: '↑+', title: t('rowAbove'), action: () => this._addRow('above') },
      { label: '↓+', title: t('rowBelow'), action: () => this._addRow('below') },
      { label: '←+', title: t('colLeft'), action: () => this._addCol('left') },
      { label: '+→', title: t('colRight'), action: () => this._addCol('right') },
      { label: '↑✕', title: t('deleteRow'), action: () => this._deleteRow() },
      { label: '✕→', title: t('deleteCol'), action: () => this._deleteCol() },
      { label: '🗑', title: t('deleteTable'), action: () => this._deleteTable() },
    ];
    buttons.forEach(({ label, title, action }) => {
      const btn = document.createElement('button');
      btn.className = 'wysiwyg-btn';
      btn.textContent = label;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); action(); });
      bar.appendChild(btn);
    });
    return bar;
  }

  private _getCurrentCell(): HTMLTableCellElement | null {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    return sel.anchorNode.parentElement?.closest('td, th') as HTMLTableCellElement | null;
  }

  private _addRow(position: 'above' | 'below'): void {
    if (!this._activeTable) return;
    const cell = this._getCurrentCell();
    const row = cell?.closest('tr') as HTMLTableRowElement | null;
    if (!row) return;
    const newRow = document.createElement('tr');
    for (let i = 0; i < row.cells.length; i++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      newRow.appendChild(td);
    }
    if (position === 'above') row.before(newRow);
    else row.after(newRow);
    this.editor['_history'].snapshot();
  }

  private _addCol(position: 'left' | 'right'): void {
    if (!this._activeTable) return;
    const cell = this._getCurrentCell();
    if (!cell) return;
    const cellIdx = cell.cellIndex;
    const rows = this._activeTable.rows;
    for (let r = 0; r < rows.length; r++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      const targetCell = rows[r].cells[cellIdx];
      if (position === 'left') targetCell.before(td);
      else targetCell.after(td);
    }
    this.editor['_history'].snapshot();
  }

  private _deleteRow(): void {
    const cell = this._getCurrentCell();
    const row = cell?.closest('tr');
    if (row && row.parentNode) {
      row.parentNode.removeChild(row);
      this.editor['_history'].snapshot();
    }
  }

  private _deleteCol(): void {
    if (!this._activeTable) return;
    const cell = this._getCurrentCell();
    if (!cell) return;
    const idx = cell.cellIndex;
    const rows = this._activeTable.rows;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r].cells[idx]) rows[r].deleteCell(idx);
    }
    this.editor['_history'].snapshot();
  }

  private _deleteTable(): void {
    if (this._activeTable) {
      this._activeTable.remove();
      this._hideToolbar();
      this.editor['_history'].snapshot();
    }
  }

  private _tableTabNav(shift: boolean): void {
    const cell = this._getCurrentCell();
    if (!cell) return;
    const row = cell.closest('tr') as HTMLTableRowElement;
    const table = cell.closest('table') as HTMLTableElement;
    const cells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
    const idx = cells.indexOf(cell);
    if (!shift) {
      if (idx < cells.length - 1) {
        const nextCell = cells[idx + 1];
        this._focusCell(nextCell);
      } else {
        this._addRow('below');
        const newRow = row.parentElement?.lastElementChild as HTMLTableRowElement;
        if (newRow?.cells[0]) this._focusCell(newRow.cells[0]);
      }
    } else {
      if (idx > 0) this._focusCell(cells[idx - 1]);
    }
  }

  private _focusCell(cell: HTMLTableCellElement): void {
    const range = document.createRange();
    range.setStart(cell, 0);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  destroy(): void {
    this._listeners.forEach(fn => fn());
    this._floatingToolbar?.remove();
  }
}
