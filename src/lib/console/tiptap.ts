import type { JSONContent } from '@tiptap/core';

/**
 * Turning what the editor holds back into markdown.
 *
 * The rule this file exists to keep: THE EDITOR CAN ONLY PRODUCE WHAT THE
 * RENDERER CAN RENDER. src/lib/console/markdown.ts supports headings,
 * paragraphs, lists, quotes, code, tables, images, links and emphasis — so the
 * editor is configured with exactly that set and this serialiser handles
 * exactly that set. Anything else would round-trip to markdown that renders
 * differently from what was typed, and on a contract that difference is the
 * document changing under the signer.
 *
 * The loading direction reuses the renderer itself: markdown to HTML to Tiptap.
 * That makes the renderer the single definition of what the content IS, in both
 * directions, rather than two implementations that can drift apart.
 */

/** Characters that mean something in markdown and must survive as themselves. */
const ESCAPE_PATTERN = /([*_~`[\]\\])/g;

function inlineToMarkdown(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';

  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n';
      if (node.type === 'image') {
        const src = String(node.attrs?.src ?? '');
        const alt = String(node.attrs?.alt ?? '');
        return src ? `![${alt}](${src})` : '';
      }
      if (node.type !== 'text' || typeof node.text !== 'string') return '';

      const marks = node.marks ?? [];
      const names = marks.map((mark) => mark.type);

      // Code is literal: its contents are never escaped, because the renderer
      // does not interpret anything inside backticks either.
      if (names.includes('code')) return `\`${node.text}\``;

      // Escaped before marks are applied, so text containing a marker survives
      // a round trip instead of turning into emphasis on the way back.
      let text = node.text.replace(ESCAPE_PATTERN, '\\$1');

      if (names.includes('strike')) text = `~~${text}~~`;
      if (names.includes('italic')) text = `*${text}*`;
      if (names.includes('bold')) text = `**${text}**`;

      const link = marks.find((mark) => mark.type === 'link');
      if (link?.attrs?.href) text = `[${text}](${String(link.attrs.href)})`;

      return text;
    })
    .join('');
}

/**
 * A list item's text, then the items of any list nested inside it as items of
 * their own. The renderer's lists are flat, and the editor keeps them flat
 * (editor-extensions.ts); this is the net under that, so a nested item that
 * reaches here becomes a line of its own instead of disappearing on save.
 */
function listItemTexts(item: JSONContent): string[] {
  const own: string[] = [];
  const nested: string[] = [];
  for (const block of item.content ?? []) {
    if (block.type === 'bulletList' || block.type === 'orderedList') {
      for (const child of block.content ?? []) nested.push(...listItemTexts(child));
    } else {
      own.push(inlineToMarkdown(block.content));
    }
  }
  const text = own.join(' ');
  return text === '' && nested.length > 0 ? nested : [text, ...nested];
}

function tableToMarkdown(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((block) => inlineToMarkdown(block.content))
        .join(' ')
        // A pipe inside a cell would end the cell, so it is escaped.
        .replace(/\|/g, '\\|')
        .trim(),
    ),
  );

  if (rows.length === 0) return '';

  const [header, ...body] = rows;
  const width = header!.length;
  const line = (cellValues: string[]) =>
    `| ${Array.from({ length: width }, (_unused, index) => cellValues[index] ?? '').join(' | ')} |`;

  return [
    line(header!),
    `| ${Array.from({ length: width }, () => '---').join(' | ')} |`,
    ...body.map(line),
  ].join('\n');
}

function blockToMarkdown(node: JSONContent): string {
  switch (node.type) {
    case 'heading': {
      // The renderer emits h3/h4/h5 for two, three and four hashes, because a
      // document sits below the page's own h1.
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 3), 2), 5);
      return `${'#'.repeat(level - 1)} ${inlineToMarkdown(node.content)}`;
    }
    case 'paragraph':
      return inlineToMarkdown(node.content);
    case 'bulletList':
      return (node.content ?? [])
        .flatMap(listItemTexts)
        .map((text) => `- ${text}`)
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .flatMap(listItemTexts)
        .map((text, index) => `${index + 1}. ${text}`)
        .join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((block) => `> ${inlineToMarkdown(block.content)}`)
        .join('\n');
    case 'codeBlock': {
      const language = String(node.attrs?.language ?? '');
      const body = (node.content ?? []).map((child) => child.text ?? '').join('');
      return `\`\`\`${language}\n${body}\n\`\`\``;
    }
    case 'table':
      return tableToMarkdown(node);
    case 'image': {
      const src = String(node.attrs?.src ?? '');
      const alt = String(node.attrs?.alt ?? '');
      return src ? `![${alt}](${src})` : '';
    }
    case 'horizontalRule':
      return '---';
    default:
      // Anything the editor should not have been able to make. Its text is
      // kept rather than silently dropped — losing a client's words is worse
      // than losing their formatting.
      return inlineToMarkdown(node.content);
  }
}

export function documentToMarkdown(doc: JSONContent | undefined): string {
  if (!doc?.content) return '';

  return doc.content
    .map(blockToMarkdown)
    .map((block) => block.trimEnd())
    .filter((block) => block !== '')
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

