import type { PageContentPuck } from "@/lib/page-builder/schema";

/**
 * Accessibility-Prüfung über den Puck-Baum (Feature 2).
 *
 * Reine Funktion (kein DOM/DB) → läuft im Editor (Warnungen) und in Tests. Prüft:
 * - fehlende Alt-Texte (Image-Block, Galerie-Bilder, <img> in RichText)
 * - fehlende Embed-Titel (iframe-Beschriftung)
 * - Heading-Reihenfolge (übersprungene Ebenen, z. B. h2 → h4; inkl. Heading-Block)
 *
 * Bewusst über denselben Slot-Abstieg wie der Renderer (rekursiv über content + Slot-Props).
 */

export interface A11yIssue {
  level: "error" | "warning";
  message: string;
  nodeId?: string;
}

interface PuckNode {
  type: string;
  props: Record<string, unknown> & { id?: string };
}

function isNodeArray(value: unknown): value is PuckNode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) => v != null && typeof v === "object" && "type" in v && "props" in v
    )
  );
}

/** Findet <img>-Tags ohne (nicht-leeres) alt-Attribut. */
function imagesWithoutAlt(html: string): number {
  let count = 0;
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const altMatch = tag.match(/\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'/i);
    const alt = altMatch ? (altMatch[1] ?? altMatch[2] ?? "") : null;
    if (alt === null || alt.trim() === "") count++;
  }
  return count;
}

/** Sammelt Heading-Ebenen (1-6) in Dokumentreihenfolge aus HTML. */
function headingLevels(html: string): number[] {
  const levels: number[] = [];
  const re = /<h([1-6])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    levels.push(Number(m[1]));
  }
  return levels;
}

function walk(nodes: PuckNode[], issues: A11yIssue[], headings: number[]): void {
  for (const node of nodes) {
    const { type, props } = node;
    const id = typeof props.id === "string" ? props.id : undefined;

    if (type === "RichText" && typeof props.html === "string") {
      const missing = imagesWithoutAlt(props.html);
      if (missing > 0) {
        issues.push({
          level: "warning",
          message: `${missing} Bild(er) im Text ohne Alt-Text`,
          nodeId: id,
        });
      }
      headings.push(...headingLevels(props.html));
    }

    if (type === "Image") {
      const alt = typeof props.alt === "string" ? props.alt.trim() : "";
      const src = typeof props.src === "string" ? props.src.trim() : "";
      if (src && !alt) {
        issues.push({ level: "warning", message: "Bild ohne Alt-Text", nodeId: id });
      }
    }

    // Heading-Block fließt in die Reihenfolge-Prüfung ein.
    if (type === "Heading") {
      const lvl = Number(props.level);
      if (lvl >= 1 && lvl <= 6) headings.push(lvl);
    }

    // Galerie: Bilder ohne Alt-Text zählen.
    if (type === "Gallery" && Array.isArray(props.items)) {
      const missing = (props.items as { src?: string; alt?: string }[]).filter(
        (it) => it?.src && !(it.alt && it.alt.trim())
      ).length;
      if (missing > 0) {
        issues.push({
          level: "warning",
          message: `${missing} Galerie-Bild(er) ohne Alt-Text`,
          nodeId: id,
        });
      }
    }

    // Embed ohne Titel (Screenreader-Beschriftung des iframes).
    if (type === "Embed") {
      const url = typeof props.url === "string" ? props.url.trim() : "";
      const title = typeof props.title === "string" ? props.title.trim() : "";
      if (url && !title) {
        issues.push({ level: "warning", message: "Embed ohne Titel", nodeId: id });
      }
    }

    // Slot-Props rekursiv.
    for (const value of Object.values(props)) {
      if (isNodeArray(value)) {
        walk(value, issues, headings);
      }
    }
  }
}

export function analyzePuckA11y(data: PageContentPuck): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const headings: number[] = [];
  const content = (data?.content as PuckNode[]) ?? [];
  walk(content, issues, headings);

  // Heading-Reihenfolge: keine Ebene überspringen (z. B. h2 → h4).
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) {
      issues.push({
        level: "warning",
        message: `Heading-Ebene übersprungen (h${headings[i - 1]} → h${headings[i]})`,
      });
    }
  }

  return issues;
}
