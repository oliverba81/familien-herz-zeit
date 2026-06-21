import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

const MAX_SIZE = 10 * 1024 * 1024;

export class ImagePlugin extends BasePlugin {
  readonly name = 'Image';
  private _observer: MutationObserver | null = null;
  private _selectedImg: HTMLImageElement | null = null;
  private _controlledImages = new WeakSet<HTMLImageElement>();
  private _onDocumentClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (target.closest('.wysiwyg-img-toolbar') || target === this._selectedImg) return;
    this._clearImageSelection();
  };

  init(): void {
    this.registerCommand('insertImage', () => this._openModal());
    this.registerCommand('insertImageFile', (args) => this._insertFile(args as File));
    this._attachImageControls();
    this._observer = new MutationObserver(() => this._attachImageControls());
    this._observer.observe(this.editor.editorEl, { childList: true, subtree: true });
    document.addEventListener('click', this._onDocumentClick);
  }

  private _openModal(): void {
    this.editor.selection.saveRange();

    const form = document.createElement('div');
    form.className = 'wysiwyg-form';

    const urlInput = this._input('text', t('imageUrl'));
    const altInput = this._input('text', t('altText'));
    const titleInput = this._input('text', t('imageTitle'));
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'wysiwyg-file-input';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        if (file.size > MAX_SIZE) {
          this.editor.options.onError?.({ type: 'imageUpload', message: t('imageTooBig') });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => { urlInput.value = reader.result as string; };
        reader.readAsDataURL(file);
      }
    });

    form.appendChild(this._row(t('imageUrl'), urlInput));
    form.appendChild(this._row(t('altText'), altInput));
    form.appendChild(this._row(t('imageTitle'), titleInput));
    form.appendChild(this._row(t('uploadFile'), fileInput));

    const modal = new Modal({
      title: t('insertImage'),
      content: form,
      onConfirm: () => {
        const src = urlInput.value.trim();
        if (!src) return;
        this.editor.selection.restoreRange();
        this.editor.focus();
        this._insertFigure(src, altInput.value.trim(), titleInput.value.trim());
        this.editor['_history'].snapshot();
      },
      onCancel: () => { this.editor.selection.restoreRange(); },
    });
    modal.open();
    setTimeout(() => urlInput.focus(), 50);
  }

  _insertFile(file: File): void {
    if (file.size > MAX_SIZE) {
      this.editor.options.onError?.({ type: 'imageUpload', message: t('imageTooBig') });
      return;
    }
    if (this.editor.options.onImageUpload) {
      this.editor.options.onImageUpload(file).then(url => {
        this._insertFigure(url, file.name);
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this._insertFigure(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  }

  private _insertFigure(src: string, alt = '', title = ''): void {
    const figure = document.createElement('figure');
    figure.className = 'wysiwyg-figure';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    if (title) img.title = title;
    const caption = document.createElement('figcaption');
    caption.contentEditable = 'true';
    caption.setAttribute('data-placeholder', t('addCaption'));
    figure.appendChild(img);
    figure.appendChild(caption);

    this._addImageControls(img);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(figure);
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      figure.after(p);
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      this.editor.editorEl.appendChild(figure);
    }
  }

  private _addImageControls(img: HTMLImageElement): void {
    if (this._controlledImages.has(img)) return;
    this._controlledImages.add(img);
    img.classList.add('wysiwyg-img');
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      this._clearImageSelection();
      this._selectedImg = img;
      img.classList.add('wysiwyg-img-selected');
      this._showImageToolbar(img);
    });
  }

  private _showImageToolbar(img: HTMLImageElement): void {
    document.querySelector('.wysiwyg-img-toolbar')?.remove();
    const toolbar = document.createElement('div');
    toolbar.className = 'wysiwyg-img-toolbar';

    const alignments: Array<{ key: string; label: string }> = [
      { key: 'left', label: '←' },
      { key: 'center', label: '↔' },
      { key: 'right', label: '→' },
      { key: 'full', label: '⬛' },
    ];
    alignments.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = key;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._setImageAlignment(img, key);
        this.editor['_history'].snapshot();
        this._positionImageToolbar(toolbar, img);
      });
      toolbar.appendChild(btn);
    });

    const sizeSeparator = document.createElement('span');
    sizeSeparator.className = 'wysiwyg-img-toolbar-separator';
    toolbar.appendChild(sizeSeparator);

    const sizes = [25, 50, 75, 100];
    sizes.forEach(size => {
      const btn = document.createElement('button');
      btn.textContent = `${size}%`;
      btn.title = `Bildbreite ${size}%`;
      btn.className = 'wysiwyg-img-size-btn';
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._setImageWidth(img, size);
        this.editor['_history'].snapshot();
        this._positionImageToolbar(toolbar, img);
      });
      toolbar.appendChild(btn);
    });

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '10';
    input.max = '100';
    input.step = '5';
    input.value = this._getImageWidthPercent(img);
    input.title = 'Bildbreite in Prozent';
    input.className = 'wysiwyg-img-size-input';
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', () => {
      const size = Math.max(10, Math.min(100, Number(input.value) || 100));
      input.value = String(size);
      this._setImageWidth(img, size);
      this.editor['_history'].snapshot();
      this._positionImageToolbar(toolbar, img);
    });
    toolbar.appendChild(input);

    toolbar.style.position = 'fixed';
    document.body.appendChild(toolbar);
    this._positionImageToolbar(toolbar, img);
  }

  private _attachImageControls(): void {
    this.editor.editorEl.querySelectorAll<HTMLImageElement>('img').forEach(img => this._addImageControls(img));
  }

  private _clearImageSelection(): void {
    document.querySelectorAll('.wysiwyg-img-selected').forEach(e => e.classList.remove('wysiwyg-img-selected'));
    document.querySelector('.wysiwyg-img-toolbar')?.remove();
    this._selectedImg = null;
  }

  private _setImageAlignment(img: HTMLImageElement, key: string): void {
    img.classList.remove('wysiwyg-img-left', 'wysiwyg-img-center', 'wysiwyg-img-right', 'wysiwyg-img-full');
    img.classList.add(`wysiwyg-img-${key}`);
    if (key === 'full') {
      img.style.width = '100%';
    }
  }

  private _setImageWidth(img: HTMLImageElement, size: number): void {
    img.classList.remove('wysiwyg-img-full');
    img.style.width = `${size}%`;
    img.style.height = 'auto';
  }

  private _getImageWidthPercent(img: HTMLImageElement): string {
    const inlineWidth = img.style.width.match(/^(\d+(?:\.\d+)?)%$/);
    if (inlineWidth) return String(Math.round(Number(inlineWidth[1])));

    const figure = img.closest('.wysiwyg-figure') ?? this.editor.editorEl;
    const containerWidth = figure.getBoundingClientRect().width || this.editor.editorEl.getBoundingClientRect().width;
    const width = img.getBoundingClientRect().width;
    if (!containerWidth || !width) return '100';
    return String(Math.max(10, Math.min(100, Math.round((width / containerWidth) * 100))));
  }

  private _positionImageToolbar(toolbar: HTMLElement, img: HTMLImageElement): void {
    const rect = img.getBoundingClientRect();
    toolbar.style.top = `${Math.max(8, rect.top - 38)}px`;
    toolbar.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - toolbar.offsetWidth - 8))}px`;
  }

  private _input(type: string, placeholder: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.className = 'wysiwyg-input';
    return input;
  }

  private _row(label: string, input: HTMLElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'wysiwyg-form-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  destroy(): void {
    this._observer?.disconnect();
    document.removeEventListener('click', this._onDocumentClick);
    this._clearImageSelection();
  }
}
