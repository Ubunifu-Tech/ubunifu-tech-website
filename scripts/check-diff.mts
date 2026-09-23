/**
 * A client's suggested wording must never put a live image on a staff page.
 *
 * renderParagraphDiff (src/lib/console/diff.ts) shows the client's text to
 * staff as HTML. Everything in it is escaped by the document renderer, and
 * images are turned into their description, because a picture would be fetched
 * from wherever the client points it the moment staff open the page.
 *
 * The renderer lifts backslash escapes and inline code out of a line before it
 * looks for images, so an alt text holding "\]" or "`]`" is an image to the
 * renderer and not to a pattern run over the markdown. These cases are the
 * shapes that got through once; any <img in the output is a failure.
 *
 * Run with: npx tsx scripts/check-diff.mts
 */

const { renderParagraphDiff } = await import('../src/lib/console/diff');

const SENT = 'Intro paragraph.\n\nClause one.\n\nClause two.';
const withClause = (clause: string) => `Intro paragraph.\n\nClause one.\n\n${clause}`;

type Case = { name: string; suggested: string; sent?: string; expect?: string };

const CASES: Case[] = [
  { name: 'plain image', suggested: withClause('![plan](https://evil.example/a.png)'), expect: '(image: plan)' },
  { name: 'no alt', suggested: withClause('![](https://evil.example/a.png)'), expect: '(image)' },
  { name: 'escaped bracket in alt', suggested: withClause('![a\\]b](https://evil.example/bypass.png)') },
  { name: 'inline code in alt', suggested: withClause('![`]`](https://evil.example/y.png)') },
  { name: 'escaped backslash in alt', suggested: withClause('![a\\\\](https://evil.example/z.png)') },
  { name: 'site-relative image', suggested: withClause('![x](/uploads/a.png)'), expect: '(image: x)' },
  { name: 'image inside a link', suggested: withClause('[![x](https://evil.example/l.png)](https://evil.example)') },
  { name: 'image in a list', suggested: withClause('- ![x\\]](https://evil.example/li.png)') },
  {
    name: 'image in a table cell',
    suggested: withClause('| A | B |\n| --- | --- |\n| ![x\\]](https://evil.example/t.png) | 1 |'),
  },
  { name: 'image in a heading', suggested: withClause('## ![`x`](https://evil.example/h.png)') },
  { name: 'image in a quote', suggested: withClause('> ![x](https://evil.example/q.png)') },
  // The version they were sent can hold one too; the removed side is shown.
  {
    name: 'image in what was sent',
    sent: `${SENT}\n\n![s\\]](https://evil.example/s.png)`,
    suggested: 'Intro paragraph.\n\nClause one.',
  },
  // Raw HTML is escaped, never a tag.
  { name: 'raw img tag', suggested: withClause('<img src="https://evil.example/raw.png">'), expect: '&lt;img' },
];

let failures = 0;
for (const test of CASES) {
  const { html } = renderParagraphDiff(test.sent ?? SENT, test.suggested);
  const problems: string[] = [];
  if (/<img\b/i.test(html)) problems.push('an <img> tag is in the output');
  if (html.includes('\u0000')) problems.push('a parked placeholder leaked into the output');
  if (test.expect && !html.includes(test.expect)) problems.push(`expected to find ${test.expect}`);
  if (problems.length > 0) {
    failures += 1;
    console.error(`FAIL  ${test.name}: ${problems.join('; ')}\n      ${html.replace(/\n/g, '\n      ')}`);
  } else {
    console.log(`ok    ${test.name}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${CASES.length} failed.`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} passed.`);
