export function getHTML(el: HTMLElement): string {
  return el.innerHTML;
}

export function getText(el: HTMLElement): string {
  return el.innerText ?? el.textContent ?? '';
}
