import type { MetadataRoute } from 'next';
import { readPosts } from '@/lib/blog';
import { projects } from '@/content/portfolio';

const BASE_URL = 'https://ubunifutech.com';

// Generates /sitemap.xml at build time. Includes all public static routes plus a
// dynamic entry per published blog post. `lastModified` for blog posts uses
// the front-matter `date` so search engines see fresh content when we
// publish a new post.
/**
 * Re-rendered at most every five minutes, as well as the moment anything is
 * published. The publish action already revalidates this page — but a post
 * given a FUTURE date is published now and goes live later, and at that later
 * moment nobody presses anything. Without a time-based revalidate it simply
 * never appeared. Five minutes is also how long a page rendered during a
 * database outage keeps saying so before it tries again.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/build`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/industries`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/work`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/careers`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const caseStudyRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${BASE_URL}/work/${project.slug}`,
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  // An unreachable journal drops the article URLs from the map rather than
  // failing it. A sitemap missing some entries is re-crawled; a sitemap that
  // 500s teaches a crawler to come back less often.
  const { posts } = await readPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...caseStudyRoutes, ...blogRoutes];
}
