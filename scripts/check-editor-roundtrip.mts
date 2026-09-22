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

const { getSchema, generateJSON } = await import('@tiptap/core');
const { default: StarterKit } = await import('@tiptap/starter-kit');
const { CharacterCount } = await import('@tiptap/extension-character-count');
const { Image } = await import('@tiptap/extension-image');
const { Table, TableCell, TableHeader, TableRow } = await import('@tiptap/extension-table');
const { Typography } = await import('@tiptap/extension-typography');
const { renderMarkdown } = await import('../src/lib/console/markdown');
const { documentToMarkdown } = await import('../src/lib/console/tiptap');

/**
 * The same configuration the editor uses. If these drift apart the test stops
 * proving anything, so any change in RichText.tsx belongs here too.
 */
function extensionsFor(profile: 'document' | 'post') {
  const base = [
    StarterKit.configure({
      heading: { levels: [3, 4, 5] },
      link: { openOnClick: false, autolink: true, protocols: ['http', 'https'] },
      underline: false,
      code: profile === 'post' ? undefined : (false as const),
      codeBlock: profile === 'post' ? undefined : (false as const),
    }),
    Typography,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
  ];
  if (profile === 'post') {
    base.push(Image.configure({ inline: false, allowBase64: false }) as never);
  }
  return base;
}

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

if (failures.length > 0) {
  console.error(
    `\nThe editor changes a document by opening it. Every existing signature verifies against the rendered output, so this must be lossless.\n\n${failures.join('\n\n')}\n`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Editor round-trip check passed: ${CASES.length} documents survive markdown → editor → markdown with identical rendered output.`,
  );
}
