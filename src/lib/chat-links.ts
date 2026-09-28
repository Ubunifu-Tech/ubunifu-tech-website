import { dynamicPrefixes, sitePages } from '@/content/site-pages';
import { site } from '@/content/site';

/**
 * Which links an assistant reply may contain, and where each one goes.
 *
 * A reply is written by a model that reads visitor text, so it can be talked
 * into writing any link at all. The renderer therefore links nothing it has
 * not recognised here: a page on this site, a site we name ourselves (our
 * products, client sites from the case studies, the team's public profiles),
 * or our own email address and phone number. Everything else, including
 * javascript:, data:, plain http and every other host, renders as plain text,
 * so a prompt-injected phishing link is just words on the screen.
 *
 * Pure and client-safe: the chat window imports it, so it must not pull in
 * server code or the content modules behind the pages. That is why
 * EXTERNAL_HOSTS is typed out here rather than derived from products,
 * portfolio and team; check:assistant compares the two so they cannot drift.
 */

export type ChatVariant = 'site' | 'portal' | 'console';

export type ChatLink = {
  /** internal opens in place, external in a new tab, mail is mailto: or tel:. */
  kind: 'internal' | 'external' | 'mail';
  href: string;
};

/** Where the public site lives, for links shown inside the console. */
export const PUBLIC_ORIGIN = 'https://ubunifutech.com';

export const EXTERNAL_HOSTS: ReadonlyArray<string> = [
  'ubunifutech.com',
  'www.ubunifutech.com',
  'insight.ubunifutech.com',
  'sifa.ubunifutech.com',
  'safarikingafrica.com',
  'www.safarikingafrica.com',
  'usambaradestination.com',
  'www.usambaradestination.com',
  'github.com',
  'linkedin.com',
];

/** Our own hosts: a full address on one of these is really a page link. */
const OWN_HOSTS: ReadonlyArray<string> = ['ubunifutech.com', 'www.ubunifutech.com'];

const STATIC_PATHS: ReadonlyArray<string> = sitePages.map((page) => page.path);

/**
 * A path on this site, with an optional #section. Lower and upper case both
 * appear below the dynamic prefixes (portal references such as INV-2026-001).
 */
const PATH = /^\/(?:[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*)?(?:#[A-Za-z0-9-]+)?$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAILTO = new RegExp(`^mailto:${escapeRegExp(site.contact.email)}(?:\\?subject=[^&#\\s]*)?$`, 'i');
const TEL = `tel:${site.contact.phoneTel}`;

/** The path if it is one a visitor can be sent to, otherwise null. */
function sitePath(path: string): string | null {
  if (!PATH.test(path)) return null;
  const base = path.split('#')[0];
  if (STATIC_PATHS.includes(base)) return path;
  // A case study, an article or a portal page: something must follow the prefix.
  if (dynamicPrefixes.some((prefix) => base.startsWith(prefix) && base.length > prefix.length)) return path;
  return null;
}

/**
 * What a link in a reply is, or null when it must render as plain text.
 *
 * The console variant turns page links into full addresses on the public site,
 * because on the admin host /build would be rewritten to a console page.
 */
export function classifyHref(href: string | null | undefined, variant: ChatVariant): ChatLink | null {
  const value = (href ?? '').trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    const path = sitePath(value);
    if (!path) return null;
    return variant === 'console'
      ? { kind: 'external', href: `${PUBLIC_ORIGIN}${path}` }
      : { kind: 'internal', href: path };
  }

  if (MAILTO.test(value) || value === TEL) return { kind: 'mail', href: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!EXTERNAL_HOSTS.includes(url.hostname)) return null;

  // Our own page written out in full opens in place, like its path would.
  if (variant !== 'console' && OWN_HOSTS.includes(url.hostname) && !url.search) {
    const path = sitePath(`${url.pathname.replace(/(.)\/$/, '$1')}${url.hash}`);
    if (path) return { kind: 'internal', href: path };
  }
  return { kind: 'external', href: url.href };
}

/**
 * Stretches that are already links, or are code, and are left exactly as they
 * are: fenced and inline code, markdown links and images, and <autolinks>.
 */
const PROTECTED = /(```[\s\S]*?```|`[^`\n]*`|!?\[[^\]\n]*\]\([^)\n]*\)|<[^>\s]+>)/;

/**
 * A bare address, path or our email, standing on its own: after the start of
 * a line, a space, a bracket or emphasis, and followed only by punctuation
 * that ends the sentence. "/build." links /build; "/build?x=1" and "a/build"
 * link nothing.
 */
const BARE = new RegExp(
  String.raw`(^|[\s(*_])` +
    String.raw`(?:(https:\/\/[^\s<>()[\]]+?)|(\/[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*(?:#[A-Za-z0-9-]+)?)|(` +
    escapeRegExp(site.contact.email) +
    '))' +
    String.raw`(?=[.,;:!?)\]'"’”*_]*(?:\s|$))`,
  'gm',
);

/**
 * Turns the bare paths, addresses and email in a reply into markdown links
 * before it is parsed, so "see /build" is as tappable as "[our services](/build)".
 * Only what classifyHref accepts is linked; anything else is left as written.
 */
export function linkifyBarePaths(text: string, variant: ChatVariant): string {
  return text
    .split(PROTECTED)
    .map((piece, index) => {
      // split() with a capturing group puts the protected stretches at odd indexes.
      if (index % 2 === 1) return piece;
      const glued = index > 0;
      return piece.replace(
        BARE,
        (match, prefix: string, url?: string, path?: string, email?: string, offset?: number) => {
          const at = offset ?? 0;
          // Straight after a link or code span, with no space: part of that, not a new link.
          if (glued && at === 0 && prefix === '') return match;
          // The target of a link written as [text](/path) that the split did not catch.
          if (prefix === '(' && piece[at - 1] === ']') return match;

          if (url) {
            if (!classifyHref(url, variant)) return match;
            const label = url.replace(/^https:\/\//, '').replace(/\/$/, '');
            return `${prefix}[${label}](${url})`;
          }
          if (path) {
            if (!classifyHref(path, variant)) return match;
            return `${prefix}[${path}](${path})`;
          }
          if (email) return `${prefix}[${email}](mailto:${email})`;
          return match;
        },
      );
    })
    .join('');
}

/**
 * A reply without its markdown, for the screen-reader announcement: links
 * become their text, and emphasis, heading and quote markers go.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
    .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)/g, '$1$2')
    .replace(/`+/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
