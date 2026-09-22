/**
 * The covers a post gets when nobody gave it one.
 *
 * Every article used to fall back to the same single image, so a run of posts
 * written without a cover looked like one post repeated. These six are the
 * wordless compositions the site already draws — src/components/StoryVisual.tsx
 * renders each of them as an SVG, and the .webp beside it is what a link
 * preview on WhatsApp or LinkedIn actually shows, since a social crawler will
 * not run our React.
 *
 * Deliberately NOT generated per post and NOT chosen at random. Random would
 * mean a post's illustration changed on every render and its preview image
 * changed on every deploy; generated would mean a seventh style nobody drew.
 * The choice is a hash of the slug, so it is decided once, by the address, and
 * never moves again.
 *
 * Plain data on purpose: this is imported by src/lib/blog-files.ts, which the
 * migration and parity scripts load outside Next, where a CSS import would
 * fail.
 */

export type BlogCover = { image: string; alt: string };

/**
 * Alt text matches the composition that gets drawn, not the file. A reader on
 * a screen reader and a reader looking at the page are told the same thing.
 */
export const blogCovers: readonly BlogCover[] = [
  {
    image: '/editorial/tourism-systems.webp',
    alt: 'A connected journey moving through planning stages into one working tourism system.',
  },
  {
    image: '/editorial/swahili-learning.webp',
    alt: 'A learning exchange connecting a question, a lesson, and a reviewed answer.',
  },
  {
    image: '/editorial/credit-ledger.webp',
    alt: 'A sale and partial payments remaining connected to one visible credit ledger.',
  },
  {
    image: '/editorial/build-or-buy.webp',
    alt: 'One requirement branching toward a standard platform or a custom-built system.',
  },
  {
    image: '/editorial/software-tanzania-learning.webp',
    alt: 'Working notes and repeated revisions resolving into one assembled software product.',
  },
  {
    image: '/editorial/usage-based-pricing.webp',
    alt: 'Measured units of work connecting directly to an itemised usage record.',
  },
] as const;

/**
 * FNV-1a, because it has to agree everywhere.
 *
 * The server renders the page, a script writes the sitemap and a social crawler
 * reads the preview, all in separate processes. Anything seeded by time or
 * randomness would give a different answer in each, and the illustration on the
 * page would stop matching the image in the link preview.
 */
function hash(slug: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < slug.length; index += 1) {
    value ^= slug.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function coverForSlug(slug: string): BlogCover {
  return blogCovers[hash(slug) % blogCovers.length]!;
}
