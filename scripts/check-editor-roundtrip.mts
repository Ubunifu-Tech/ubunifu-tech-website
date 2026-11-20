/**
 * The editor must not change a document by being opened.
 *
 * Every signature in this system is a SHA-256 of `renderMarkdown(body)`. The
 * editor loads that markdown by rendering it to HTML, handing the HTML to
 * Tiptap, and serialising back on save — so if that trip is not lossless AT THE
 * RENDERED LEVEL, opening a contract and saving it silently changes what a
 * signature attests to.
 *
 * This asserts the property directly: for a corpus covering everything the
 * renderer supports, renderMarkdown(original) must equal
 * renderMarkdown(roundTrip(original)), byte for byte.
 *
 * Run with: npx tsx scripts/check-editor-roundtrip.ts
 */

import { JSDOM } from 'jsdom';

// ProseMirror parses HTML with the DOM, so one has to exist before Tiptap is
// imported. Assigned to globalThis rather than passed in, because that is where
// prosemirror-model looks.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const globals = globalThis as unknown as Record<string, unknown>;
globals.window = dom.window;
globals.document = dom.window.document;
globals.DOMParser = dom.window.DOMParser;
globals.Node = dom.window.Node;
globals.Element = dom.window.Element;
globals.HTMLElement = dom.window.HTMLElement;
// navigator is a getter-only global in modern Node, and ProseMirror only
// consults it for platform quirks that do not apply to parsing.

globals.getComputedStyle = dom.window.getComputedStyle;

const { Editor, getSchema, generateJSON, StarterKit } = await import('./editor-core');
const { renderMarkdown } = await import('../src/lib/console/markdown');
const { documentToMarkdown } = await import('../src/lib/console/tiptap');
const { editorExtensions, looksLikeMarkdown, pasteMarkdown } = await import('../src/lib/console/editor-extensions');
const { toConfirmCount } = await import('../src/lib/console/to-confirm');

/** The editor's own configuration, imported rather than copied, so it cannot drift. */
const extensionsFor = editorExtensions;

// Fails loudly if a configuration cannot produce a valid schema at all.
getSchema(extensionsFor('document'));
getSchema(extensionsFor('post'));

function roundTrip(markdown: string, profile: 'document' | 'post'): string {
  const html = renderMarkdown(markdown) || '<p></p>';
  const json = generateJSON(html, extensionsFor(profile));
  return documentToMarkdown(json);
}

type Case = { name: string; markdown: string; profile?: 'document' | 'post' };

const CASES: Case[] = [
  { name: 'empty', markdown: '' },
  { name: 'one paragraph', markdown: 'A single line of plain text.' },
  {
    name: 'headings at every level',
    markdown: '## Two\n\nBody.\n\n### Three\n\nBody.\n\n#### Four\n\nBody.',
  },
  {
    name: 'bold and italic',
    markdown: 'The fee is **US$150.00** and the term is *thirty days*.',
  },
  {
    name: 'bullets',
    markdown: '## What is included\n\n- Domain registration\n- Design kit\n- Responsive homepage',
  },
  {
    name: 'numbered list',
    markdown: '## Payment\n\n1. **US$75.00** on kick-off.\n2. **US$75.00** on sign-off.',
  },
  { name: 'horizontal rule', markdown: 'Before.\n\n---\n\nAfter.' },
  {
    name: 'the real agreement',
    markdown: `## What we are building

A website for Nifuate Tanzania Adventures covering treks, safari bush and beach excursions.

## What is included

- Domain registration and setup
- Design kit and colour palette
- Responsive homepage and package pages

## What it costs

The build is **US$150.00**, split in two:

1. **US$75.00** on kick-off. Work starts once it is received.
2. **US$75.00** on final sign-off and handover.

---

## How long it takes

Six weeks from kick-off.`,
  },
  {
    name: 'asterisks in the prose survive',
    markdown: 'A 5 * 3 calculation and an under_score in the middle.',
  },
  {
    name: 'a TO CONFIRM marker',
    markdown: 'The balance is due [TO CONFIRM: how many days after handover].',
  },
  { name: 'a quote', markdown: '> They said the site paid for itself in a season.' },
  {
    name: 'strikethrough',
    markdown: 'The fee is ~~US$200.00~~ **US$150.00**.',
  },
  {
    name: 'links, internal and external',
    markdown:
      'See [our work](/work) and [the brief](https://example.com/brief) before signing.',
  },
  {
    name: 'a fee table',
    markdown: `## Fees

| Item | When | Amount |
| --- | --- | --- |
| Deposit | Kick-off | **US$75.00** |
| Balance | Handover | **US$75.00** |`,
  },
  {
    name: 'a table with a pipe inside a cell',
    markdown: `| Option | Note |
| --- | --- |
| A \\| B | Either one |`,
  },
  {
    name: 'inline code',
    markdown: 'Set `DATABASE_URL` before the build runs.',
    profile: 'post',
  },
  {
    name: 'a fenced code block',
    markdown: '```ts\nconst total = lines.reduce((sum, line) => sum + line.amountMinor, 0);\n```',
    profile: 'post',
  },
  {
    name: 'an image',
    markdown: '![A workbench with two paths](/editorial/build-or-buy.webp)',
    profile: 'post',
  },
  {
    name: 'a dangerous link is neutralised',
    markdown: 'Careful with [this one](javascript:alert(1)) please.',
  },
  {
    name: 'everything at once',
    markdown: `## Scope

A build for **Nifuate**, covering [treks](/work) and beach excursions.

> Agreed on the call of 14 September.

### What is included

- Domain and hosting
- ~~Print collateral~~ removed from scope
- Responsive pages

| Stage | Amount |
| --- | --- |
| Deposit | US$75.00 |
| Balance | US$75.00 |

---

1. Kick-off
2. Handover`,
  },
];

const failures: string[] = [];

for (const testCase of CASES) {
  const profile = testCase.profile ?? 'document';
  const before = renderMarkdown(testCase.markdown);
  const after = renderMarkdown(roundTrip(testCase.markdown, profile));

  if (before !== after) {
    failures.push(
      `${testCase.name} (${profile}):\n  before: ${JSON.stringify(before)}\n  after:  ${JSON.stringify(after)}`,
    );
  }
}

// ── Nested lists are flattened, never dropped ───────────────────────────────

const text = (value: string) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] });
const item = (value: string, ...children: object[]) => ({ type: 'listItem', content: [text(value), ...children] });
const check = (name: string, actual: unknown, wanted: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${name}:\n  got:    ${JSON.stringify(actual)}\n  wanted: ${JSON.stringify(wanted)}`);
  }
};
const hasNestedList = (node: { type?: string; content?: object[] }, insideItem = false): boolean =>
  ((node.type === 'bulletList' || node.type === 'orderedList') && insideItem) ||
  (node.content ?? []).some((child) => hasNestedList(child as never, node.type === 'listItem'));

check(
  'a nested bullet list saves as items of their own',
  documentToMarkdown({
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: [
          item('Website', { type: 'bulletList', content: [item('Home page'), item('Booking form')] }),
          item('Hosting'),
        ],
      },
    ],
  }),
  '- Website\n- Home page\n- Booking form\n- Hosting',
);
check(
  'bullets inside a numbered list keep their place in the numbering',
  documentToMarkdown({
    type: 'doc',
    content: [
      {
        type: 'orderedList',
        content: [
          item('Deposit', { type: 'bulletList', content: [item('On signing')] }),
          item('Balance'),
        ],
      },
    ],
  }),
  '1. Deposit\n2. On signing\n3. Balance',
);

{
  const editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions('document') });

  // A pasted or loaded outline, three deep, comes out one level deep.
  editor.commands.setContent(
    '<ul><li><p>Website</p><ul><li><p>Home page</p><ul><li><p>Hero</p></li></ul></li></ul></li><li><p>Hosting</p></li></ul>',
  );
  check('the editor holds no nested list after an outline arrives', hasNestedList(editor.getJSON()), false);
  check(
    'every line of the outline is kept',
    documentToMarkdown(editor.getJSON()),
    '- Website\n- Home page\n- Hero\n- Hosting',
  );

  // Tab is not the editor's in a list, so it moves on instead of nesting.
  editor.commands.setContent('<ul><li><p>First</p></li><li><p>Second</p></li></ul>');
  const secondEnd = editor.state.doc.firstChild!.child(0).nodeSize + 3 + 'Second'.length;
  editor.commands.setTextSelection(secondEnd);
  const tabHandled = editor.view.someProp('handleKeyDown', (handle) =>
    handle(editor.view, new dom.window.KeyboardEvent('keydown', { key: 'Tab' }) as unknown as KeyboardEvent),
  );
  check('Tab in a list is left to the browser', Boolean(tabHandled), false);

  // Anything else that nests an item, such as a command, is lifted straight
  // back, with the cursor still where it was in the text.
  editor.commands.sinkListItem('listItem');
  check('a nested item is lifted back', hasNestedList(editor.getJSON()), false);
  check('and the item is still there', documentToMarkdown(editor.getJSON()), '- First\n- Second');
  check(
    'the cursor stays at the end of Second',
    [editor.state.selection.$head.parent.textContent, editor.state.selection.$head.parentOffset],
    ['Second', 'Second'.length],
  );

  // The control: without FlatLists the same steps do nest, so the two checks
  // above are testing something.
  {
    const bare = new Editor({
      element: document.createElement('div'),
      extensions: editorExtensions('document').filter((extension) => extension.name !== 'flatLists'),
    });
    bare.commands.setContent('<ul><li><p>First</p></li><li><p>Second</p></li></ul>');
    bare.commands.setTextSelection(bare.state.doc.firstChild!.child(0).nodeSize + 3);
    bare.commands.sinkListItem('listItem');
    check('without FlatLists, a nested item stays nested (the control)', hasNestedList(bare.getJSON()), true);
    bare.destroy();

    const stock = new Editor({ element: document.createElement('div'), extensions: [StarterKit] });
    stock.commands.setContent('<ul><li><p>First</p></li><li><p>Second</p></li></ul>');
    stock.commands.setTextSelection(stock.state.doc.firstChild!.child(0).nodeSize + 3);
    check(
      "with Tiptap's own list item, Tab is taken (the control)",
      Boolean(
        stock.view.someProp('handleKeyDown', (handle) =>
          handle(stock.view, new dom.window.KeyboardEvent('keydown', { key: 'Tab' }) as unknown as KeyboardEvent),
        ),
      ),
      true,
    );
    stock.destroy();
  }

  // ── Pasting markdown as plain text ─────────────────────────────────────────
  check('a heading line is markdown', looksLikeMarkdown('## Scope\nWhat we build.'), true);
  check('a dash list is markdown', looksLikeMarkdown('Includes:\n- Hosting\n- Email'), true);
  check('a numbered list is markdown', looksLikeMarkdown('1. Deposit\n2. Balance'), true);
  check('a sentence is not', looksLikeMarkdown('Thanks for the call today.'), false);
  check('a hyphen inside a sentence is not', looksLikeMarkdown('A two-page site - nothing more.'), false);

  const paste = (plain: string, html = '') =>
    pasteMarkdown(editor.view, {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? plain : type === 'text/html' ? html : '') },
    } as unknown as ClipboardEvent);

  editor.commands.setContent('<p></p>');
  check('markdown pasted as text is taken', paste('## Scope\n\n- Hosting\n  - Email\n- Domain'), true);
  check(
    'and becomes a heading and a flat list, not literal marks',
    documentToMarkdown(editor.getJSON()),
    '## Scope\n\n- Hosting\n- Email\n- Domain',
  );
  editor.commands.setContent('<p>Intro</p>');
  editor.commands.setTextSelection(1 + 'Intro'.length);
  paste('## Scope\n\n- Hosting');
  check(
    'pasted at the end of a sentence, the heading starts a block of its own',
    documentToMarkdown(editor.getJSON()),
    'Intro\n\n## Scope\n\n- Hosting',
  );
  check('plain prose is left to the editor', paste('Thanks for the call today.'), false);
  check('structured HTML is left to the editor', paste('## Scope', '<h2>Scope</h2>'), false);
  check('HTML that is only styled text is read as its markdown', paste('## Scope', '<div><span>## Scope</span></div>'), true);

  editor.destroy();
}

// ── TO CONFIRM markers survive saving and are still counted ──────────────────

{
  const body = 'Due [TO CONFIRM: how many days] after **[TO CONFIRM: which milestone]**.';
  const saved = roundTrip(body, 'document');
  check('the editor saves a marker with its bracket escaped', saved.includes('\\[TO CONFIRM'), true);
  check('both markers are counted after saving', toConfirmCount(saved), 2);
  check('and after a second save', toConfirmCount(roundTrip(saved, 'document')), 2);
  check('a marker with emphasis inside is counted', toConfirmCount('[TO *CONFIRM*: the date]'), 1);
  check('a body without one counts none', toConfirmCount('Due within 14 days of the invoice.'), 0);
}

if (failures.length > 0) {
  console.error(
    `\nThe editor changes a document by opening it, or loses or miscounts what was typed. Every existing signature verifies against the rendered output, so this must be lossless.\n\n${failures.join('\n\n')}\n`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Editor round-trip check passed: ${CASES.length} documents survive markdown → editor → markdown with identical rendered output, nested lists flatten instead of disappearing, pasted markdown becomes structure, and TO CONFIRM markers are still counted.`,
  );
}
