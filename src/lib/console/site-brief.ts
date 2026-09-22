import 'server-only';
import { site } from '@/content/site';
import { services } from '@/content/services';
import { products } from '@/content/products';
import { sectors } from '@/content/sectors';
import { projects } from '@/content/portfolio';
import { approach, mission } from '@/content/about';
import { readPosts } from '@/lib/blog';

/**
 * What the website assistant knows, taken from the same content the pages
 * render. Editing a service or a product on the site changes what the
 * assistant says about it, so the two cannot drift apart.
 */

const PAGES = [
  ['/build', 'every service'],
  ['/work', 'case studies'],
  ['/products', 'our own products'],
  ['/industries', 'sectors we work in'],
  ['/blog', 'articles'],
  ['/about', 'who we are and how we work'],
  ['/contact', 'the contact form'],
] as const;

let cached: { text: string; at: number } | null = null;
const TEN_MINUTES = 10 * 60 * 1000;

export async function siteBrief(): Promise<string> {
  // The brief is sent with every conversation and cached by the model API, so
  // it should be byte-identical between turns. Rebuilding it at most every ten
  // minutes keeps it stable and still picks up a newly published article.
  if (cached && Date.now() - cached.at < TEN_MINUTES) return cached.text;

  const { posts } = await readPosts();

  const text = [
    'WHAT THE WEBSITE SAYS. Use this as your knowledge. Link to a page by its path, like /build, when it helps.',
    '',
    `Company: ${site.name}, based in ${site.location}. ${mission}`,
    `Email: ${site.contact.email}. Phone: ${site.contact.phone}.`,
    '',
    'SERVICES',
    ...services.map(
      (service) =>
        `- ${service.title} (/build#${service.key}): ${service.description} Includes: ${service.items.join(', ')}.`,
    ),
    '',
    'OUR PRODUCTS',
    ...products.map(
      (product) =>
        `- ${product.name}: ${product.tagline}. ${product.description}${
          product.status === 'soon' ? ' (Coming soon.)' : product.url ? ` (${product.url})` : ''
        }`,
    ),
    '',
    'SECTORS',
    ...sectors.map((sector) => `- ${sector.label}: ${sector.summary}`),
    '',
    'RECENT WORK',
    ...projects.map(
      (project) => `- ${project.title} (${project.category}, /work/${project.slug}): ${project.description}`,
    ),
    '',
    'HOW WE WORK',
    ...approach.map((step) => `- ${step.title}: ${step.body}`),
    '',
    'PAGES',
    ...PAGES.map(([path, what]) => `- ${path}: ${what}`),
    ...(posts.length > 0
      ? ['', 'RECENT ARTICLES', ...posts.slice(0, 8).map((post) => `- ${post.title} (/blog/${post.slug})`)]
      : []),
  ].join('\n');

  cached = { text, at: Date.now() };
  return text;
}
