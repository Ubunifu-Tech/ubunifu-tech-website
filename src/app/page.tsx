import { PageAtmosphere } from '@/components/PageAtmosphere';
import { HomeLanding, type HomeInsight } from '@/components/HomeLanding';
import { getAllPosts, resolveBlogCover } from '@/lib/blog';
import { projects } from '@/content/portfolio';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Consulting + products, built in Tanzania',
  description:
    'Ubunifu Technologies is a Tanzanian technology consultancy that also builds and operates products across web, data, AI, brand, hosting, and software.',
  path: '/',
});

export default function Home() {
  const candidates = getAllPosts().slice(0, 3);
  // Keep the latest three stories, but don't repeat the project art just shown above.
  const lead = candidates.find((post) => !projects.some((project) => project.artwork.src === resolveBlogCover(post).image));
  const latestPosts = (lead
    ? [lead, ...candidates.filter((post) => post.slug !== lead.slug)]
    : candidates
  ).map<HomeInsight>((post) => {
    const cover = resolveBlogCover(post);
    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      tags: post.tags,
      image: cover.image,
      alt: cover.alt,
    };
  });

  return (
    <>
      <PageAtmosphere />
      <HomeLanding posts={latestPosts} />
    </>
  );
}
