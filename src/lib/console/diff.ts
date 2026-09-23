import { renderMarkdown } from './markdown';

/**
 * Paragraph-level comparison of two markdown texts.
 *
 * Written for one job: showing staff what a client changed when they sent back
 * their own wording for a document. Word-level diffs of legal text are noisy
 * and hard to act on; a clause that was rewritten reads better as the old
 * clause struck through and the new one beneath it.
 *
 * No dependency, on purpose. The comparison is a longest-common-subsequence
 * alignment over blocks, which is a page of code, and the rendering goes
 * through the same escaping renderer as every other document so the client's
 * text can never become markup of its own.
 */

export type DiffOp = 'same' | 'removed' | 'added';

export type DiffPart = {
  op: DiffOp;
  /** The block's markdown: the later text for 'same' and 'added', the earlier for 'removed'. */
  text: string;
  /** Index of the block in the earlier text, when it came from there. */
  before: number | null;
  /** Index of the block in the later text, when it is in there. */
  after: number | null;
};

type BlockKind = 'paragraph' | 'list' | 'ordered' | 'quote';

const FENCE = /^\s*```/;
const HEADING = /^#{1,4}\s+/;
const RULE = /^(-{3,}|\*{3,})$/;
const QUOTE = /^\s*>/;
const BULLET = /^\s*[-*]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const DELIMITER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * Splits markdown into the blocks a reader sees: a heading, a paragraph, a
 * list, a quote, a table, a rule, a fenced block.
 *
 * Boundaries follow src/lib/console/markdown.ts rather than blank lines alone.
 * The editor always puts a blank line between blocks, but a drafted document
 * may not ("## Fees" directly above its first line), and splitting on blank
 * lines alone would mark that pair as changed when the client touched neither.
 */
export function splitParagraphs(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let kind: BlockKind | null = null;

  const flush = () => {
    const text = current.join('\n').trim();
    if (text) blocks.push(text);
    current = [];
    kind = null;
  };
  const continueAs = (next: BlockKind, line: string) => {
    if (kind !== next) flush();
    kind = next;
    current.push(line);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trimEnd();

    if (FENCE.test(line)) {
      flush();
      const fenced = [line];
      while (index + 1 < lines.length) {
        index += 1;
        fenced.push(lines[index]!);
        if (FENCE.test(lines[index]!)) break;
      }
      blocks.push(fenced.join('\n').trimEnd());
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    if (HEADING.test(line) || RULE.test(line.trim())) {
      flush();
      blocks.push(line.trim());
      continue;
    }

    if (line.includes('|') && DELIMITER.test(lines[index + 1] ?? '')) {
      flush();
      const table = [line, lines[index + 1]!.trimEnd()];
      index += 2;
      while (index < lines.length && lines[index]!.includes('|') && lines[index]!.trim() !== '') {
        table.push(lines[index]!.trimEnd());
        index += 1;
      }
      index -= 1;
      blocks.push(table.join('\n').trim());
      continue;
    }

    if (QUOTE.test(line)) continueAs('quote', line);
    else if (BULLET.test(line)) continueAs('list', line);
    else if (NUMBERED.test(line)) continueAs('ordered', line);
    else continueAs('paragraph', line);
  }
  flush();
  return blocks;
}

/**
 * What a block means, for comparing. Two blocks that render to the same HTML
 * are the same to anyone reading them: "* item" and "- item", a renumbered
 * list, an escaped underscore. The editor rewrites all of those on save, and
 * none of them is a change the client made.
 */
function meaning(block: string): string {
  return renderMarkdown(block).replace(/\s+/g, ' ').trim();
}

/**
 * Beyond this many cells the alignment table would take real memory. Past it
 * the middle of the two texts is shown as replaced wholesale, which is still
 * true, just less precise.
 */
const MAX_CELLS = 4_000_000;

/** Aligns two lists of blocks. Removed blocks come before added ones in each change. */
export function diffBlocks(
  before: string[],
  after: string[],
  key: (block: string) => string = meaning,
): DiffPart[] {
  const a = before.map(key);
  const b = after.map(key);

  // The common start and end are cheap to find and usually most of a document.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const parts: DiffPart[] = [];
  for (let index = 0; index < start; index += 1) {
    parts.push({ op: 'same', text: after[index]!, before: index, after: index });
  }

  const n = endA - start;
  const m = endB - start;

  if (n * m > MAX_CELLS) {
    for (let index = start; index < endA; index += 1) {
      parts.push({ op: 'removed', text: before[index]!, before: index, after: null });
    }
    for (let index = start; index < endB; index += 1) {
      parts.push({ op: 'added', text: after[index]!, before: null, after: index });
    }
  } else {
    // lengths[i][j] is the longest common run of a[start+i..] and b[start+j..],
    // filled from the end so the walk below can go forwards.
    const width = m + 1;
    const lengths = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        lengths[i * width + j] =
          a[start + i] === b[start + j]
            ? lengths[(i + 1) * width + j + 1]! + 1
            : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
      }
    }

    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        parts.push({ op: 'same', text: after[start + j]!, before: start + i, after: start + j });
        i += 1;
        j += 1;
      } else if (j >= m || (i < n && lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!)) {
        parts.push({ op: 'removed', text: before[start + i]!, before: start + i, after: null });
        i += 1;
      } else {
        parts.push({ op: 'added', text: after[start + j]!, before: null, after: start + j });
        j += 1;
      }
    }
  }

  for (let offset = 0; offset < a.length - endA; offset += 1) {
    parts.push({
      op: 'same',
      text: after[endB + offset]!,
      before: endA + offset,
      after: endB + offset,
    });
  }
  return parts;
}

/** Compares two markdown texts block by block. */
export function diffParagraphs(before: string, after: string): DiffPart[] {
  return diffBlocks(splitParagraphs(before), splitParagraphs(after));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * One block as HTML.
 *
 * Through the document renderer, which escapes everything before it adds back
 * its fixed set of tags, so a table still reads as a table. Images are the one
 * exception: a picture in a client's text would be fetched from wherever they
 * point it the moment staff open the page, so it is shown as its description.
 */
function blockHtml(block: string): string {
  const withoutImages = block.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_match, alt: string) => `(image${alt.trim() ? `: ${alt.trim()}` : ''})`,
  );
  return renderMarkdown(withoutImages);
}

/** Unchanged blocks kept on each side of a change, so it can be read in place. */
const CONTEXT = 1;

export type RenderedDiff = {
  /** Safe to set as HTML: every piece of text in it has been escaped. */
  html: string;
  added: number;
  removed: number;
};

/**
 * The comparison as HTML: unchanged blocks plainly, removed ones inside <del>,
 * added ones inside <ins>. Long runs of unchanged text fold into a <details>
 * so a one-clause change in a ten-page agreement is not a ten-page scroll.
 *
 * The caller styles del, ins and details under its own class.
 */
export function renderParagraphDiff(before: string, after: string): RenderedDiff {
  const parts = diffParagraphs(before, after);
  const out: string[] = [];
  let added = 0;
  let removed = 0;

  const firstChange = parts.findIndex((part) => part.op !== 'same');
  const lastChange = parts.length - 1 - [...parts].reverse().findIndex((part) => part.op !== 'same');

  let index = 0;
  while (index < parts.length) {
    const part = parts[index]!;

    if (part.op === 'removed') {
      removed += 1;
      out.push(`<del>${blockHtml(part.text)}</del>`);
      index += 1;
      continue;
    }
    if (part.op === 'added') {
      added += 1;
      out.push(`<ins>${blockHtml(part.text)}</ins>`);
      index += 1;
      continue;
    }

    // A run of unchanged blocks.
    let end = index;
    while (end < parts.length && parts[end]!.op === 'same') end += 1;
    const run = parts.slice(index, end).map((same) => `<div>${blockHtml(same.text)}</div>`);

    const leading = firstChange === -1 || index < firstChange;
    const trailing = firstChange !== -1 && index > lastChange;
    const keepStart = leading ? 0 : CONTEXT;
    const keepEnd = trailing ? 0 : CONTEXT;
    const hidden = run.length - keepStart - keepEnd;

    if (firstChange === -1 || hidden < 2) {
      out.push(...run);
    } else {
      out.push(...run.slice(0, keepStart));
      out.push(
        `<details><summary>${escapeHtml(`${hidden} unchanged paragraphs`)}</summary>${run
          .slice(keepStart, keepStart + hidden)
          .join('')}</details>`,
      );
      out.push(...run.slice(keepStart + hidden));
    }
    index = end;
  }

  return { html: out.join('\n'), added, removed };
}
