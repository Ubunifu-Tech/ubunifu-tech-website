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
const { renderMarkdown } = await import('../src/lib/console/markdown');
const { documentToMarkdown } = await import('../src/lib/console/tiptap');

/**
 * The same configuration the editor uses. If these drift apart the test stops
 * proving anything, so any change in RichText.tsx belongs here too.
 */
const extensions = [
  StarterKit.configure({
    heading: { levels: [3, 4, 5] },
    code: false,
    codeBlock: false,
    blockquote: false,
    strike: false,
    link: false,
    underline: false,
  }),
];

getSchema(extensions);

function roundTrip(markdown: string): string {
  const html = renderMarkdown(markdown) || '<p></p>';
  const json = generateJSON(html, extensions);
  return documentToMarkdown(json);
}

const CASES: { name: string; markdown: string }[] = [
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
];

const failures: string[] = [];

for (const testCase of CASES) {
  const before = renderMarkdown(testCase.markdown);
  const after = renderMarkdown(roundTrip(testCase.markdown));

  if (before !== after) {
    failures.push(
      `${testCase.name}:\n  before: ${JSON.stringify(before)}\n  after:  ${JSON.stringify(after)}`,
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
