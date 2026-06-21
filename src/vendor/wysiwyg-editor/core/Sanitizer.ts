const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
  'caption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'colgroup', 'col',
  'blockquote', 'pre', 'code', 'span', 'div', 'hr',
  'input', 'video', 'source', 'section',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'class', 'style']),
  td: new Set(['colspan', 'rowspan', 'style', 'class']),
  th: new Set(['colspan', 'rowspan', 'style', 'class', 'scope']),
  col: new Set(['style', 'width']),
  li: new Set(['data-checked', 'class']),
  input: new Set(['type', 'checked', 'disabled', 'contenteditable']),
  code: new Set(['class', 'data-language']),
  pre: new Set(['class', 'data-language']),
  div: new Set([
    'class', 'style', 'data-language',
    // FHZ page-builder embed blocks (page-builder-v2-shell): must survive
    // setHTML / insertHTML / paste / source-toggle sanitization.
    'data-fhz-block', 'data-fhz-block-id', 'data-fhz-block-data', 'contenteditable',
  ]),
  span: new Set(['class', 'style']),
  p: new Set(['style', 'class']),
  figure: new Set(['class']),
  figcaption: new Set(['contenteditable', 'data-placeholder', 'class']),
  blockquote: new Set(['class']),
  table: new Set(['class', 'style']),
  ul: new Set(['class', 'style']),
  ol: new Set(['class', 'style']),
  section: new Set(['class', 'style']),
  video: new Set(['src', 'controls', 'width', 'height', 'poster', 'preload', 'loop', 'muted', 'playsinline', 'class', 'style']),
  source: new Set(['src', 'type']),
};

// Präsentations-CSS, das im WYSIWYG-Builder erhalten bleiben muss, damit die
// Editor-Ansicht 1:1 wie die veröffentlichte Seite aussieht (Hero, CTA, Karten,
// Grids, Rahmen, Schatten – siehe src/lib/page-builder/v1-to-v2-html.ts).
// Hinweis: `url(...)`-Werte werden in sanitizeStyle zusätzlich geprüft.
const ALLOWED_STYLE_PROPS = new Set([
  // Text / Schrift
  'color', 'background-color', 'font-size', 'font-family',
  'font-weight', 'font-style', 'font', 'text-decoration', 'text-align', 'text-align-last',
  'text-transform', 'text-shadow', 'line-height', 'letter-spacing', 'white-space',
  'list-style', 'list-style-type', 'vertical-align',
  // Hintergrund
  'background', 'background-image', 'background-position', 'background-size',
  'background-repeat', 'background-clip', '-webkit-background-clip',
  'backdrop-filter', '-webkit-backdrop-filter', 'opacity',
  // Rahmen / Form / Schatten
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-collapse', 'border-spacing', 'box-shadow', 'box-sizing', 'outline',
  // Box-Modell / Maße
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'float', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
  'overflow', 'overflow-x', 'overflow-y', 'object-fit', 'aspect-ratio',
  // Layout / Positionierung
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self',
  // Tabellen
  'table-layout',
]);

// In CSS-Werten verbotene URL-Schemata (z. B. background-image: url(javascript:…)).
const BLOCKED_STYLE_VALUE_PATTERNS = [
  /url\(\s*['"]?\s*(?:javascript|vbscript|data:text\/html)/i,
  /expression\s*\(/i,
  /-moz-binding/i,
];

const BLOCKED_URL_PATTERNS = [
  /^javascript:/i, /^vbscript:/i,
  /^data:(?!image\/)/i,
  /^blob:/i,
];

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(trimmed)) return '#';
  }
  return trimmed;
}

function sanitizeStyle(styleStr: string): string {
  const result: string[] = [];
  styleStr.split(';').forEach(decl => {
    const [prop, ...rest] = decl.split(':');
    if (!prop || rest.length === 0) return;
    const propName = prop.trim().toLowerCase();
    if (!ALLOWED_STYLE_PROPS.has(propName)) return;
    const value = rest.join(':').trim();
    if (BLOCKED_STYLE_VALUE_PATTERNS.some((p) => p.test(value))) return;
    result.push(`${propName}: ${value}`);
  });
  return result.join('; ');
}

function sanitizeElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return false;

  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  const toRemove: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (/^on/.test(name)) { toRemove.push(attr.name); continue; }
    if (!allowed.has(name) && name !== 'style') { toRemove.push(attr.name); continue; }
    if ((name === 'href' || name === 'src') && tag !== 'img') {
      el.setAttribute(name, sanitizeUrl(attr.value));
    }
    if (name === 'src' && tag === 'img') {
      const v = attr.value.trim();
      if (!v.startsWith('data:image/') && BLOCKED_URL_PATTERNS.some(p => p.test(v))) {
        toRemove.push(attr.name);
      }
    }
    if (name === 'style') {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) el.setAttribute('style', cleaned);
      else toRemove.push(attr.name);
    }
  }
  toRemove.forEach(a => el.removeAttribute(a));

  if (tag === 'a' && el.getAttribute('target') === '_blank') {
    el.setAttribute('rel', 'noopener noreferrer');
  }
  if (tag === 'input' && el.getAttribute('type') !== 'checkbox') {
    return false;
  }
  return true;
}

export class Sanitizer {
  sanitize(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;
    this._sanitizeNode(container);
    return container.innerHTML;
  }

  private _sanitizeNode(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'meta' || tag === 'link') {
          node.removeChild(child);
          continue;
        }
        if (!sanitizeElement(el)) {
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
          continue;
        }
        this._sanitizeNode(el);
      }
    }
  }
}
