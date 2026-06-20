import { BasePlugin } from './BasePlugin';

type Alignment = 'left' | 'center' | 'right' | 'justify';

const BLOCK_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,blockquote,li,td,th,figcaption,div';

export class AlignmentPlugin extends BasePlugin {
  readonly name = 'Alignment';

  init(): void {
    this.registerCommand('alignLeft', () => this._align('left'));
    this.registerCommand('alignCenter', () => this._align('center'));
    this.registerCommand('alignRight', () => this._align('right'));
    this.registerCommand('alignJustify', () => this._align('justify'));
  }

  private _align(alignment: Alignment): void {
    const blocks = this._getSelectedBlocks();
    blocks.forEach(block => {
      block.style.textAlign = alignment;
      block.style.textAlignLast = alignment === 'justify' ? 'justify' : '';
    });
    this.editor['_history'].snapshot();
  }

  private _getSelectedBlocks(): HTMLElement[] {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];

    const range = sel.getRangeAt(0);
    const blocks = new Set<HTMLElement>();
    const anchorBlock = this._getBlockForNode(sel.anchorNode);
    if (anchorBlock) blocks.add(anchorBlock);

    if (range.collapsed) {
      if (blocks.size > 0) return Array.from(blocks);
      const wrappedBlock = this._wrapCurrentInlineRun(range);
      return wrappedBlock ? [wrappedBlock] : [];
    }

    this.editor.editorEl.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach(block => {
      if (block !== this.editor.editorEl && this._rangeTextForNode(range, block).trim()) {
        blocks.add(block);
      }
    });

    if (blocks.size > 0) return Array.from(blocks);

    const wrappedSelection = this._wrapSelectedInlineContent(range);
    return wrappedSelection ? [wrappedSelection] : [];
  }

  private _getBlockForNode(node: Node | null): HTMLElement | null {
    const element = node?.nodeType === Node.ELEMENT_NODE
      ? node as HTMLElement
      : node?.parentElement;
    const block = element?.closest<HTMLElement>(BLOCK_SELECTOR);
    if (!block || block === this.editor.editorEl || !this.editor.editorEl.contains(block)) return null;
    return block;
  }

  private _wrapCurrentInlineRun(range: Range): HTMLElement | null {
    let child: Node | null = range.startContainer;
    while (child && child.parentNode !== this.editor.editorEl) {
      child = child.parentNode;
    }
    if (!child) return null;

    const isBoundary = (node: Node) =>
      node.nodeType === Node.ELEMENT_NODE
      && ((node as Element).tagName === 'BR' || (node as Element).matches(BLOCK_SELECTOR));

    let first: Node = child;
    while (first.previousSibling && !isBoundary(first.previousSibling)) {
      first = first.previousSibling;
    }

    let last: Node = child;
    while (last.nextSibling && !isBoundary(last.nextSibling)) {
      last = last.nextSibling;
    }

    const paragraph = document.createElement('p');
    this.editor.editorEl.insertBefore(paragraph, first);

    let current: Node | null = first;
    while (current) {
      const next: Node | null = current === last ? null : current.nextSibling;
      paragraph.appendChild(current);
      current = next;
    }

    return paragraph;
  }

  private _wrapSelectedInlineContent(range: Range): HTMLElement | null {
    if (!this._selectionTouchesEditorRoot(range)) return null;

    const content = range.extractContents();
    if (!content.textContent?.trim()) return null;

    const paragraph = document.createElement('p');
    paragraph.appendChild(content);
    range.insertNode(paragraph);

    const sel = window.getSelection();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(paragraph);
    sel?.removeAllRanges();
    sel?.addRange(nextRange);

    return paragraph;
  }

  private _selectionTouchesEditorRoot(range: Range): boolean {
    const root = this.editor.editorEl;
    return range.startContainer === root
      || range.endContainer === root
      || range.startContainer.parentNode === root
      || range.endContainer.parentNode === root;
  }

  private _rangeTextForNode(range: Range, node: Node): string {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);

    if (
      range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0
      || range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
    ) {
      return '';
    }

    const overlap = range.cloneRange();
    if (overlap.compareBoundaryPoints(Range.START_TO_START, nodeRange) < 0) {
      overlap.setStart(nodeRange.startContainer, nodeRange.startOffset);
    }
    if (overlap.compareBoundaryPoints(Range.END_TO_END, nodeRange) > 0) {
      overlap.setEnd(nodeRange.endContainer, nodeRange.endOffset);
    }

    return overlap.toString();
  }

  destroy(): void {}
}
