export function getAncestorWithTag(node: Node | null, tag: string): HTMLElement | null {
  let current: Node | null = node;
  const upperTag = tag.toUpperCase();
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE && (current as Element).tagName === upperTag) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

export function getAncestorMatching(
  node: Node | null,
  predicate: (el: HTMLElement) => boolean,
  stopAt?: HTMLElement
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== stopAt) {
    if (current.nodeType === Node.ELEMENT_NODE && predicate(current as HTMLElement)) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

export function normalizeContent(container: HTMLElement): void {
  container.querySelectorAll('b').forEach(el => {
    const strong = document.createElement('strong');
    strong.innerHTML = el.innerHTML;
    el.replaceWith(strong);
  });
  container.querySelectorAll('i').forEach(el => {
    const em = document.createElement('em');
    em.innerHTML = el.innerHTML;
    el.replaceWith(em);
  });
  container.querySelectorAll('font').forEach(el => {
    const span = document.createElement('span');
    const color = el.getAttribute('color');
    const size = el.getAttribute('size');
    const face = el.getAttribute('face');
    let style = '';
    if (color) style += `color: ${color}; `;
    if (face) style += `font-family: ${face}; `;
    if (size) {
      const sizes = ['', '10px', '13px', '16px', '18px', '24px', '32px', '48px'];
      const idx = parseInt(size, 10);
      if (idx >= 1 && idx <= 7) style += `font-size: ${sizes[idx]}; `;
    }
    if (style) span.setAttribute('style', style.trim());
    span.innerHTML = el.innerHTML;
    el.replaceWith(span);
  });
}

export function normalizeColorSpans(container: HTMLElement): void {
  container.querySelectorAll('font[color]').forEach(el => {
    const span = document.createElement('span');
    span.style.color = el.getAttribute('color') ?? '';
    span.innerHTML = el.innerHTML;
    el.replaceWith(span);
  });
}

export function isEmptyEditor(el: HTMLElement): boolean {
  const text = el.innerText?.trim() ?? '';
  if (text !== '') return false;
  const html = el.innerHTML.trim();
  return html === '' || html === '<br>' || html === '<p><br></p>' || html === '<p></p>';
}

export function getBlockType(
  node: Node | null,
  editorEl: HTMLElement
): string {
  let current: Node | null = node;
  while (current && current !== editorEl) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const tag = (current as Element).tagName.toLowerCase();
      if (['h1','h2','h3','h4','h5','h6','p','blockquote','pre','li'].includes(tag)) {
        return tag;
      }
    }
    current = current.parentNode;
  }
  return '';
}
