import { Extension, type Extensions } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { DOMParser as ProseMirrorDOMParser, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import { ListItem } from '@tiptap/extension-list';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Image } from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Typography } from '@tiptap/extension-typography';
import { renderMarkdown } from './markdown';

export type EditorProfile = 'document' | 'post';

const LISTS = new Set(['bulletList', 'orderedList']);

/** The first list sitting inside a list item, from the top of the document. */
function firstNestedList(doc: ProseMirrorNode) {
  let found: { itemPos: number; item: ProseMirrorNode; childOffset: number; child: ProseMirrorNode } | null =
    null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'listItem') {
      node.forEach((child, offset) => {
        if (!found && LISTS.has(child.type.name)) found = { itemPos: pos, item: node, childOffset: offset, child };
      });
    }
    return !found;
  });
  return found as { itemPos: number; item: ProseMirrorNode; childOffset: number; child: ProseMirrorNode } | null;
}

/**
 * A list item without Tab. Tab nested an item, which the renderer cannot draw;
 * without it, Tab moves on from the editor as it does everywhere else.
 * Shift-Tab still lifts an item out of its list.
 */
const FlatListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };
  },
});

/**
 * Lists stay one level deep, because that is all the renderer draws, and a
 * nested list used to vanish on save. Whatever else nests one, typing "- "
 * inside an item or a pasted outline, its items are lifted to sit after their
 * parent in the same list, so what is on screen is what is saved and no line
 * is lost. The cursor goes with the text it was in.
 */
export const FlatLists = Extension.create({
  name: 'flatLists',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('flatLists'),
        appendTransaction: (transactions, _previous, state) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          const tr = state.tr;
          const cursor = state.selection.empty;
          let head = state.selection.head;
          // One nested list per pass, from the outside in, until none is left.
          for (let pass = 0; pass < 500; pass += 1) {
            const nested = firstNestedList(tr.doc);
            if (!nested) break;
            const { itemPos, item, childOffset, child } = nested;
            const childPos = itemPos + 1 + childOffset;
            const inside = head > childPos && head < childPos + child.nodeSize;
            const offset = head - (childPos + 1);
            const steps = tr.steps.length;
            tr.delete(childPos, childPos + child.nodeSize);
            const at = itemPos + item.nodeSize - child.nodeSize;
            tr.insert(at, child.content);
            head = inside ? at + offset : tr.mapping.slice(steps).map(head);
          }
          if (!tr.docChanged) return null;
          if (cursor) tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(head, tr.doc.content.size))));
          return tr;
        },
      }),
    ];
  },
});

/** Block markdown: a heading, a bullet or numbered item, or a quote at a line start. */
export function looksLikeMarkdown(text: string): boolean {
  return /^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|\s*>\s?)/m.test(text);
}

/**
 * Plain text pasted with markdown in it, from a notes app or another chat,
 * arrives as the headings and lists it describes rather than literal "##" and
 * "-": it is rendered by the same renderer that loads documents, so it can only
 * become what a document can hold. Pasted HTML that already has structure is
 * left to the editor; HTML that is only styled text, as code editors copy, is
 * read as the markdown it carries.
 */
export function pasteMarkdown(view: EditorView, event: ClipboardEvent): boolean {
  const data = event.clipboardData;
  if (!data) return false;
  const html = data.getData('text/html');
  if (html && /<(h[1-6]|ul|ol|li|table|blockquote)\b/i.test(html)) return false;
  const text = data.getData('text/plain');
  if (!text || !looksLikeMarkdown(text)) return false;
  const container = document.createElement('div');
  container.innerHTML = renderMarkdown(text);
  // Whole blocks, so a pasted heading stays a heading rather than running on
  // from the text the cursor was in.
  const parsed = ProseMirrorDOMParser.fromSchema(view.state.schema).parse(container);
  view.dispatch(view.state.tr.replaceSelection(new Slice(parsed.content, 0, 0)).scrollIntoView());
  return true;
}

/**
 * The editor's extensions, the same for the editor and for check:editor, so the
 * check proves what the editor really does. Matched to the renderer: see
 * tiptap.ts and markdown.ts.
 */
export function editorExtensions(profile: EditorProfile): Extensions {
  const base: Extensions = [
    StarterKit.configure({
      /**
       * Matched to the renderer, which emits h3/h4/h5 for two, three and
       * four hashes because a document sits below the page's own h1.
       * Configuring 2–4 here silently demoted every fourth-level heading to
       * a paragraph on load.
       */
      heading: { levels: [3, 4, 5] },
      link: {
        openOnClick: false,
        autolink: true,
        // Matches safeUrl() in the renderer. A scheme it will not render is
        // a scheme the editor should not let anybody add.
        protocols: ['http', 'https'],
      },
      // No markdown equivalent, so it would be lost on save.
      underline: false,
      // Replaced by FlatListItem below, which has no Tab.
      listItem: false,
      // A post shows code; an agreement with a code block in it is noise.
      // `false` switches an extension off, so the flag has to become that
      // literal rather than a boolean.
      code: profile === 'post' ? undefined : (false as const),
      codeBlock: profile === 'post' ? undefined : (false as const),
    }),
    // Smart quotes and dashes as you type. It changes the characters, not the
    // structure, so what is hashed is exactly what was typed.
    Typography,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
    FlatListItem,
    FlatLists,
  ];

  if (profile === 'post') {
    base.push(Image.configure({ inline: false, allowBase64: false }));
  }
  return base;
}
