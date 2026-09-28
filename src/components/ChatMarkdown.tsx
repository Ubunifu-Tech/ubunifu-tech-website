import Link from 'next/link';
import Markdown, { type Components } from 'react-markdown';
import { classifyHref, linkifyBarePaths, type ChatVariant } from '@/lib/chat-links';
import styles from './ChatMarkdown.module.css';

/**
 * An assistant's reply as formatted text: paragraphs, bold, italics, lists and
 * links, and nothing else.
 *
 * Only ever give it what an assistant wrote. A visitor's or client's own words
 * are shown as plain text by the caller and never parsed, so nobody can format
 * their way into the page.
 *
 * What keeps it safe:
 * - No HTML path at all. Raw HTML in the reply is skipped, there is no
 *   rehype-raw and no dangerouslySetInnerHTML, and React escapes the text.
 * - Every link goes through classifyHref (src/lib/chat-links.ts). A page on this
 *   site opens in place, a site we name ourselves opens in a new tab, our email
 *   and phone number open the mail or phone app, and anything else, javascript:
 *   included, is shown as plain text.
 * - Images are dropped, so a reply cannot make the browser fetch anything.
 * - Headings, code and quotes are not errors, just not our style: a heading
 *   shows as a bold line, code as ordinary text, a quote as its paragraphs.
 *   Tables are never parsed (no remark-gfm), so their pipes stay text.
 *
 * No hooks and no 'use client', so the console can render a transcript on the
 * server and the chat window can load it lazily when it first opens.
 */

const ALLOWED_ELEMENTS: ReadonlyArray<string> = [
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'code',
  'pre',
  'blockquote',
];

// Components pick out what they need rather than spreading props, so
// react-markdown's `node` never reaches the DOM.
const Heading: Components['h1'] = ({ children }) => (
  <p>
    <strong>{children}</strong>
  </p>
);

const STATIC_COMPONENTS: Components = {
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <p>{children}</p>,
  blockquote: ({ children }) => <>{children}</>,
};

function linkComponent(variant: ChatVariant, onInternalNavigate?: () => void): Components['a'] {
  return function ChatLink({ href, children }) {
    const link = classifyHref(href, variant);
    if (!link) return <>{children}</>;
    if (link.kind === 'internal') {
      return (
        <Link href={link.href} onClick={onInternalNavigate}>
          {children}
        </Link>
      );
    }
    if (link.kind === 'mail') return <a href={link.href}>{children}</a>;
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="srOnly"> (opens in a new tab)</span>
      </a>
    );
  };
}

// The component set is kept per variant and callback, because a new set on
// every render would give React new component types and remount every
// paragraph and link in the thread each time the window re-renders. That only
// holds while the caller passes a stable onInternalNavigate (useCallback).
const plainSets = new Map<ChatVariant, Components>();
const navigatingSets = new WeakMap<() => void, Map<ChatVariant, Components>>();

function componentsFor(variant: ChatVariant, onInternalNavigate?: () => void): Components {
  let sets = plainSets;
  if (onInternalNavigate) {
    sets = navigatingSets.get(onInternalNavigate) ?? new Map();
    navigatingSets.set(onInternalNavigate, sets);
  }
  let components = sets.get(variant);
  if (!components) {
    components = { ...STATIC_COMPONENTS, a: linkComponent(variant, onInternalNavigate) };
    sets.set(variant, components);
  }
  return components;
}

export type ChatMarkdownProps = {
  /** An assistant's reply. Never a visitor's or client's own words. */
  text: string;
  /** site and portal link pages in place; console links them on the public site. */
  variant: ChatVariant;
  /** Called when a page link on this site is followed, for example to close the chat on a phone. */
  onInternalNavigate?: () => void;
};

export function ChatMarkdown({ text, variant, onInternalNavigate }: ChatMarkdownProps) {
  return (
    <div className={styles.markdown}>
      <Markdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        urlTransform={(url) => classifyHref(url, variant)?.href ?? null}
        components={componentsFor(variant, onInternalNavigate)}
      >
        {linkifyBarePaths(text, variant)}
      </Markdown>
    </div>
  );
}

// For next/dynamic, which loads a module's default export.
export default ChatMarkdown;
