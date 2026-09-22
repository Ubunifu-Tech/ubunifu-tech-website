import type { Editor, JSONContent } from '@tiptap/core';

/**
 * Turning what the editor holds back into markdown.
 *
 * The rule this file exists to keep: THE EDITOR CAN ONLY PRODUCE WHAT THE
 * RENDERER CAN RENDER. src/lib/console/markdown.ts supports headings,
 * paragraphs, lists, bold, italic and a rule — so the editor is configured with
 * exactly that set and this serialiser handles exactly that set. Anything else
 * would round-trip to markdown that renders differently from what was typed,
 * and on a contract that difference is the document changing under the signer.
 *
 * The loading direction reuses the renderer itself: markdown → HTML → Tiptap.
 * That makes the renderer the single definition of what the content IS, in both
 * directions, rather than two implementations that can drift apart.
 */

/** Inline marks, escaped so a typed asterisk cannot become emphasis. */
function inlineToMarkdown(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';

  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n';
      if (node.type !== 'text' || typeof node.text !== 'string') return '';

      // Escaped before marks are applied, so text containing * or _ survives a
      // round trip instead of turning into emphasis on the way back.
      let text = node.text.replace(/([*_\\])/g, '\\$1');
      const marks = node.marks?.map((mark) => mark.type) ?? [];

      if (marks.includes('italic')) text = `*${text}*`;
      if (marks.includes('bold')) text = `**${text}**`;
      return text;
    })
    .join('');
}

function blockToMarkdown(node: JSONContent): string {
  switch (node.type) {
    case 'heading': {
      // The renderer starts documents at h2, so heading level 2 is "##".
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 5);
      return `${'#'.repeat(level - 1)} ${inlineToMarkdown(node.content)}`;
    }
    case 'paragraph':
      return inlineToMarkdown(node.content);
    case 'bulletList':
      return (node.content ?? [])
        .map((item) => `- ${listItemToMarkdown(item)}`)
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => `${index + 1}. ${listItemToMarkdown(item)}`)
        .join('\n');
    case 'horizontalRule':
      return '---';
    default:
      // Anything the editor should not have been able to make. Its text is
      // kept rather than silently dropped — losing a client's words is worse
      // than losing their formatting.
      return inlineToMarkdown(node.content);
  }
}

/** Lists are flat here, matching the renderer, so an item is its first block. */
function listItemToMarkdown(item: JSONContent): string {
  return (item.content ?? []).map((block) => inlineToMarkdown(block.content)).join(' ');
}

export function documentToMarkdown(doc: JSONContent | undefined): string {
  if (!doc?.content) return '';

  return doc.content
    .map(blockToMarkdown)
    .map((block) => block.trimEnd())
    .filter((block, index, all) => block !== '' || all[index + 1] !== undefined)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function editorToMarkdown(editor: Editor | null): string {
  if (!editor) return '';
  return documentToMarkdown(editor.getJSON());
}
