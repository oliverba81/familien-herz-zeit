const MAX_IMPORT_LEN = 500_000;

export function getMarkdown(el: HTMLElement): string {
  return nodeToMarkdown(el, 0).trim();
}

function nodeToMarkdown(node: Node, depth: number): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = () => Array.from(el.childNodes).map(c => nodeToMarkdown(c, depth)).join('');

  switch (tag) {
    case 'h1': return `\n# ${children().trim()}\n`;
    case 'h2': return `\n## ${children().trim()}\n`;
    case 'h3': return `\n### ${children().trim()}\n`;
    case 'h4': return `\n#### ${children().trim()}\n`;
    case 'h5': return `\n##### ${children().trim()}\n`;
    case 'h6': return `\n###### ${children().trim()}\n`;
    case 'p': return `\n${children().trim()}\n`;
    case 'br': return '\n';
    case 'strong': case 'b': return `**${children()}**`;
    case 'em': case 'i': return `*${children()}*`;
    case 'u': return `__${children()}__`;
    case 's': case 'del': return `~~${children()}~~`;
    case 'code': {
      if (el.closest('pre')) return el.textContent ?? '';
      return `\`${children()}\``;
    }
    case 'pre': {
      const lang = el.getAttribute('data-language') ?? el.querySelector('code')?.className?.replace('language-', '') ?? '';
      const code = el.querySelector('code')?.textContent ?? el.textContent ?? '';
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }
    case 'blockquote': return children().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n';
    case 'a': {
      const href = el.getAttribute('href') ?? '#';
      return `[${children()}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return `![${alt}](${src})`;
    }
    case 'figure': {
      const img = el.querySelector('img');
      const caption = el.querySelector('figcaption');
      if (!img) return children();
      const src = img.getAttribute('src') ?? '';
      const alt = img.getAttribute('alt') ?? '';
      const cap = caption?.textContent?.trim() ?? '';
      return `\n![${alt}](${src})\n${cap ? `*${cap}*\n` : ''}`;
    }
    case 'ul': {
      if (el.classList.contains('wysiwyg-task-list')) {
        return '\n' + Array.from(el.querySelectorAll('li')).map(li => {
          const checked = li.getAttribute('data-checked') === 'true';
          const text = li.querySelector('span')?.textContent?.trim() ?? (li.textContent ?? '').trim();
          return `- [${checked ? 'x' : ' '}] ${text}`;
        }).join('\n') + '\n';
      }
      return '\n' + Array.from(el.children).map(li => `- ${nodeToMarkdown(li, depth + 1).trim()}`).join('\n') + '\n';
    }
    case 'ol': {
      return '\n' + Array.from(el.children).map((li, i) => `${i + 1}. ${nodeToMarkdown(li, depth + 1).trim()}`).join('\n') + '\n';
    }
    case 'li': return children();
    case 'hr': return '\n---\n';
    case 'table': return tableToMarkdown(el) + '\n';
    case 'div': {
      if (el.classList.contains('wysiwyg-video-wrapper')) {
        const iframe = el.querySelector('iframe');
        const src = iframe?.src ?? '';
        return `\n[Video](${src})\n`;
      }
      return children();
    }
    case 'span': case 'figcaption': return children();
    default: return children();
  }
}

function tableToMarkdown(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return '';
  const lines: string[] = [];
  rows.forEach((row, i) => {
    const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() ?? '');
    lines.push('| ' + cells.join(' | ') + ' |');
    if (i === 0) lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
  });
  return '\n' + lines.join('\n');
}

export function importMarkdown(md: string): string {
  if (md.length > MAX_IMPORT_LEN) md = md.slice(0, MAX_IMPORT_LEN);

  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre data-language="${lang}"><code class="language-${lang}">${code.trim()}</code></pre>`
  );

  // Headings
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

  // Blockquote
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // HR
  html = html.replace(/^---+$/gm, '<hr>');

  // Bold/italic/inline-code
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Task lists
  html = html.replace(/^- \[(x| )\] (.+)$/gm, (_, checked, text) =>
    `<li data-checked="${checked === 'x' ? 'true' : 'false'}"><input type="checkbox" contenteditable="false"${checked === 'x' ? ' checked' : ''}><span>${text}</span></li>`
  );

  // UL/OL — wrap consecutive li items
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`);
    return `<ul>${items.join('')}</ul>`;
  });
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`);
    return `<ol>${items.join('')}</ol>`;
  });

  // Paragraphs
  const lines = html.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|table)/.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join('');
}
