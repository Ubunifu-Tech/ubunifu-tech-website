/**
 * A very small Markdown renderer for documents.
 *
 * Deliberately not a library. What a staff member writes in a textarea ends up
 * in front of a client and inside a contract, so the set of things it can
 * produce is fixed here rather than inherited: headings, paragraphs, lists,
 * bold, italic and horizontal rules. Everything is escaped first and only the
 * tags below are ever reintroduced, so there is no path from a document body to
 * a script tag, an iframe, or a link to somewhere we did not intend.
 *
 * It also means the rendering is stable. The same markdown always produces the
 * same bytes, which matters because that output is hashed and the hash is what
 * proves a signed document was not altered afterwards.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline emphasis, applied after escaping so the markers cannot inject tags. */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  let ordered = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      // Document bodies start at h2: the page already owns the h1.
      const level = Math.min(heading[1]!.length + 1, 5);
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      out.push('<hr />');
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (list && ordered) flushList();
      ordered = false;
      list = list ?? [];
      list.push(bullet[1]!);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (list && !ordered) flushList();
      ordered = true;
      list = list ?? [];
      list.push(numbered[1]!);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return out.join('\n');
}
