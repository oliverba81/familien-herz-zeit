import type { EditorBlock } from '../core/types';

const BLOCKED_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
const VALID_TYPES = new Set([
  'paragraph', 'heading', 'image', 'figure', 'video', 'table',
  'list', 'taskList', 'codeBlock', 'blockquote', 'hr',
]);

export function getJSON(el: HTMLElement): EditorBlock[] {
  const blocks: EditorBlock[] = [];
  for (const child of Array.from(el.children)) {
    const block = elementToBlock(child as HTMLElement);
    if (block) blocks.push(block);
  }
  return blocks;
}

function elementToBlock(el: HTMLElement): EditorBlock | null {
  const tag = el.tagName.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    return { type: 'heading', level: parseInt(tag[1], 10), text: el.textContent ?? '', html: el.outerHTML };
  }
  if (tag === 'p') return { type: 'paragraph', html: el.innerHTML };
  if (tag === 'blockquote') return { type: 'blockquote', html: el.innerHTML };
  if (tag === 'hr') return { type: 'hr' };
  if (tag === 'pre') {
    const code = el.querySelector('code');
    return {
      type: 'codeBlock',
      language: el.getAttribute('data-language') ?? code?.className?.replace('language-', '') ?? '',
      code: code?.textContent ?? el.textContent ?? '',
    };
  }
  if (tag === 'figure') {
    const img = el.querySelector('img');
    const caption = el.querySelector('figcaption');
    if (!img) return null;
    return {
      type: 'figure',
      src: img.getAttribute('src') ?? '',
      alt: img.getAttribute('alt') ?? '',
      caption: caption?.textContent?.trim() ?? '',
      align: img.className.includes('left') ? 'left' : img.className.includes('right') ? 'right' : img.className.includes('center') ? 'center' : '',
    };
  }
  if (tag === 'img') {
    return {
      type: 'image',
      src: el.getAttribute('src') ?? '',
      alt: el.getAttribute('alt') ?? '',
    };
  }
  if (tag === 'div' && el.classList.contains('wysiwyg-video-wrapper')) {
    const iframe = el.querySelector('iframe');
    const src = iframe?.src ?? '';
    const ytId = src.match(/embed\/([A-Za-z0-9_-]{11})/)?.[1];
    return {
      type: 'video',
      platform: src.includes('youtube') ? 'youtube' : 'vimeo',
      videoId: ytId ?? src.split('/').pop() ?? '',
      url: src,
    };
  }
  if (tag === 'table') {
    const rows: string[][] = [];
    el.querySelectorAll('tr').forEach(tr => {
      rows.push(Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent?.trim() ?? ''));
    });
    return { type: 'table', rows, headers: !!el.querySelector('th') };
  }
  if (tag === 'ul') {
    if (el.classList.contains('wysiwyg-task-list')) {
      const items = Array.from(el.querySelectorAll('li')).map(li => ({
        text: li.querySelector('span')?.textContent?.trim() ?? '',
        checked: li.getAttribute('data-checked') === 'true',
      }));
      return { type: 'taskList', items };
    }
    return {
      type: 'list',
      ordered: false,
      items: Array.from(el.querySelectorAll('li')).map(li => li.textContent?.trim() ?? ''),
    };
  }
  if (tag === 'ol') {
    return {
      type: 'list',
      ordered: true,
      items: Array.from(el.querySelectorAll('li')).map(li => li.textContent?.trim() ?? ''),
    };
  }
  return null;
}

export function importJSON(blocks: EditorBlock[]): string {
  return blocks.map(block => {
    for (const key of Object.keys(block)) {
      if (BLOCKED_PROPS.has(key)) return '';
    }
    if (!VALID_TYPES.has(block.type as string)) return '';

    switch (block.type) {
      case 'paragraph': return `<p>${block.html ?? ''}</p>`;
      case 'heading': return `<h${block.level}>${block.text ?? block.html ?? ''}</h${block.level}>`;
      case 'blockquote': return `<blockquote>${block.html ?? ''}</blockquote>`;
      case 'hr': return '<hr>';
      case 'codeBlock': {
        const lang = block.language as string ?? '';
        const code = (block.code as string ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre data-language="${lang}"><code class="language-${lang}">${code}</code></pre>`;
      }
      case 'figure': {
        return `<figure class="wysiwyg-figure"><img src="${block.src}" alt="${block.alt ?? ''}"${block.align ? ` class="wysiwyg-img wysiwyg-img-${block.align}"` : ''}><figcaption contenteditable="true">${block.caption ?? ''}</figcaption></figure>`;
      }
      case 'image': return `<img src="${block.src}" alt="${block.alt ?? ''}">`;
      case 'video': return `<div class="wysiwyg-video-wrapper"><iframe src="${block.url}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation" frameborder="0"></iframe></div>`;
      case 'table': {
        const rows = (block.rows as string[][] ?? []);
        const hasHeaders = block.headers as boolean;
        const rowsHtml = rows.map((cells, i) => {
          const tag = i === 0 && hasHeaders ? 'th' : 'td';
          return `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
        }).join('');
        return `<table class="wysiwyg-table">${rowsHtml}</table>`;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = (block.items as string[] ?? []).map(i => `<li>${i}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'taskList': {
        const items = (block.items as Array<{ text: string; checked: boolean }> ?? []).map(i =>
          `<li data-checked="${i.checked}"><input type="checkbox" contenteditable="false"${i.checked ? ' checked' : ''}><span>${i.text}</span></li>`
        ).join('');
        return `<ul class="wysiwyg-task-list">${items}</ul>`;
      }
      default: return '';
    }
  }).join('');
}
