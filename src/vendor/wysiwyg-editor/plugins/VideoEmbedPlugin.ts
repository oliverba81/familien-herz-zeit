import { BasePlugin } from './BasePlugin';
import { Modal } from '../ui/Modal';
import { t } from '../core/i18n';

function parseVideoUrl(url: string): { platform: string; id: string; embedUrl: string } | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    return {
      platform: 'youtube',
      id: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  return null;
}

export class VideoEmbedPlugin extends BasePlugin {
  readonly name = 'VideoEmbed';

  init(): void {
    this.registerCommand('insertVideo', () => this._openModal());
  }

  private _openModal(): void {
    this.editor.selection.saveRange();

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = t('videoUrl');
    urlInput.className = 'wysiwyg-input';

    const form = document.createElement('div');
    form.className = 'wysiwyg-form';
    form.appendChild(urlInput);

    const modal = new Modal({
      title: t('insertVideo'),
      content: form,
      onConfirm: () => {
        const parsed = parseVideoUrl(urlInput.value.trim());
        if (!parsed) return;
        this.editor.selection.restoreRange();
        this.editor.focus();
        this._insertVideo(parsed.embedUrl);
        this.editor['_history'].snapshot();
      },
      onCancel: () => { this.editor.selection.restoreRange(); },
    });
    modal.open();
    setTimeout(() => urlInput.focus(), 50);
  }

  private _insertVideo(embedUrl: string): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'wysiwyg-video-wrapper';
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.setAttribute('frameborder', '0');
    wrapper.appendChild(iframe);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(wrapper);
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      wrapper.after(p);
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      this.editor.editorEl.appendChild(wrapper);
    }
  }

  destroy(): void {}
}
