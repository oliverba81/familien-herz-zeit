import type { SelectionState } from './types';
import { getAncestorWithTag, getAncestorMatching, getBlockType } from './DOMUtils';
import { throttle } from './utils';

export class SelectionManager {
  private _editorEl: HTMLElement;
  private _savedRange: Range | null = null;
  private _onChangeCallback: (state: SelectionState) => void;
  private _canUndo = false;
  private _canRedo = false;

  constructor(editorEl: HTMLElement, onChange: (state: SelectionState) => void) {
    this._editorEl = editorEl;
    this._onChangeCallback = onChange;
  }

  private _throttledUpdate = throttle(() => {
    this._onChangeCallback(this.getState());
  }, 16) as () => void;

  attach(): void {
    document.addEventListener('selectionchange', this._throttledUpdate);
  }

  detach(): void {
    document.removeEventListener('selectionchange', this._throttledUpdate);
  }

  setHistoryState(canUndo: boolean, canRedo: boolean): void {
    this._canUndo = canUndo;
    this._canRedo = canRedo;
  }

  saveRange(): void {
    const selection = window.getSelection();
    this._savedRange = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0).cloneRange()
      : null;
  }

  restoreRange(): void {
    if (!this._savedRange) return;
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(this._savedRange);
    this._savedRange = null;
  }

  getState(): SelectionState {
    const sel = window.getSelection();
    const inEditor = sel && sel.rangeCount > 0 &&
      this._editorEl.contains(sel.getRangeAt(0).commonAncestorContainer);

    if (!inEditor || !sel) {
      return this._emptyState();
    }

    const range = sel.getRangeAt(0);
    const anchorNode = sel.anchorNode;

    const isInTable = !!getAncestorWithTag(anchorNode, 'TABLE');
    const isInBlockquote = !!getAncestorWithTag(anchorNode, 'BLOCKQUOTE');
    const preEl = getAncestorWithTag(anchorNode, 'PRE');
    const isInCodeBlock = !!preEl;
    const isInFigure = !!getAncestorWithTag(anchorNode, 'FIGURE');
    const ulEl = getAncestorWithTag(anchorNode, 'UL');
    const olEl = getAncestorWithTag(anchorNode, 'OL');
    const isInUnorderedList = !!ulEl && !(ulEl.classList.contains('wysiwyg-task-list'));
    const isInOrderedList = !!olEl;
    const isInTaskList = !!ulEl && ulEl.classList.contains('wysiwyg-task-list');
    const aEl = getAncestorWithTag(anchorNode, 'A') as HTMLAnchorElement | null;
    const codeEl = getAncestorWithTag(anchorNode, 'CODE');
    const isInlineCode = !!codeEl && !preEl;

    let alignment: SelectionState['alignment'] = '';
    const anchorEl = anchorNode?.nodeType === Node.ELEMENT_NODE
      ? anchorNode as HTMLElement
      : anchorNode?.parentElement;
    const alignedBlock = anchorEl?.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6,blockquote,li,td,th,figcaption,div');
    if (alignedBlock && alignedBlock !== this._editorEl && this._editorEl.contains(alignedBlock)) {
      const textAlign = window.getComputedStyle(alignedBlock).textAlign;
      if (textAlign === 'left' || textAlign === 'center' || textAlign === 'right' || textAlign === 'justify') {
        alignment = textAlign;
      }
    }

    let fontFamily = '';
    let fontSize = '';
    let textColor = '';
    let bgColor = '';
    try {
      fontFamily = document.queryCommandValue('fontName') || '';
      fontSize = document.queryCommandValue('fontSize') || '';
      textColor = document.queryCommandValue('foreColor') || '';
      bgColor = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '';
    } catch {
      // ignore
    }

    const spanEl = getAncestorMatching(anchorNode, el => el.tagName === 'SPAN' && !!el.style.fontSize, this._editorEl);
    if (spanEl) fontSize = spanEl.style.fontSize;
    const colorSpan = getAncestorMatching(anchorNode, el => el.tagName === 'SPAN' && !!el.style.color, this._editorEl);
    if (colorSpan) textColor = colorSpan.style.color;

    return {
      isBold: this._queryState('bold'),
      isItalic: this._queryState('italic'),
      isUnderline: this._queryState('underline'),
      isStrikethrough: this._queryState('strikeThrough'),
      isSubscript: this._queryState('subscript'),
      isSuperscript: this._queryState('superscript'),
      isInlineCode,
      blockType: getBlockType(anchorNode, this._editorEl) as SelectionState['blockType'],
      isInUnorderedList,
      isInOrderedList,
      isInTaskList,
      isInCodeBlock,
      isInBlockquote,
      isInTable,
      isInFigure,
      alignment,
      fontFamily,
      fontSize,
      textColor,
      bgColor,
      linkHref: aEl ? aEl.href : null,
      isCollapsed: range.collapsed,
      selectedText: sel.toString(),
      canUndo: this._canUndo,
      canRedo: this._canRedo,
    };
  }

  private _queryState(cmd: string): boolean {
    try { return document.queryCommandState(cmd); } catch { return false; }
  }

  private _emptyState(): SelectionState {
    return {
      isBold: false, isItalic: false, isUnderline: false,
      isStrikethrough: false, isSubscript: false, isSuperscript: false,
      isInlineCode: false, blockType: '', isInUnorderedList: false,
      isInOrderedList: false, isInTaskList: false, isInCodeBlock: false,
      isInBlockquote: false, isInTable: false, isInFigure: false,
      alignment: '', fontFamily: '', fontSize: '', textColor: '', bgColor: '',
      linkHref: null, isCollapsed: true, selectedText: '',
      canUndo: this._canUndo, canRedo: this._canRedo,
    };
  }

  selectAll(): void {
    const range = document.createRange();
    range.selectNodeContents(this._editorEl);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  wrapSelection(tagName: string): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const el = document.createElement(tagName);
    try {
      range.surroundContents(el);
    } catch {
      el.appendChild(range.extractContents());
      range.insertNode(el);
    }
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(el);
    sel.addRange(newRange);
  }
}
