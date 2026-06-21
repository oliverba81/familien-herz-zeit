/**
 * Bereitet das per-Seite „Custom CSS" so auf, dass es **nur** innerhalb der
 * WYSIWYG-Editor-Fläche (`.wysiwyg-editor-area`) wirkt – damit die Editor-Vorschau
 * wie die veröffentlichte Seite aussieht, ohne ins Admin-Chrome (Toolbar, Sidebar)
 * zu leaken.
 *
 * Nutzt CSS `@scope` (Builder ist admin-only → moderne Browser). `:root`/`html`/
 * `body`-Selektoren werden auf den Scope-Root (`:scope`) abgebildet, damit
 * Design-Tokens (z. B. `--brand`) und Body-Styles in der Vorschau greifen.
 *
 * Bei fehlender `@scope`-Unterstützung wird das CSS im Editor schlicht nicht
 * angewendet (keine Funktionsstörung; die veröffentlichte Seite ist unberührt).
 */
export function scopeCustomCssForEditor(css: string): string {
  const normalized = css.replace(
    /(^|[\s,{}>~+])(:root|html|body)\b/gi,
    "$1:scope"
  );
  return `@scope (.wysiwyg-editor-area) {\n${normalized}\n}`;
}
