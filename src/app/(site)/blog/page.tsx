import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PageHeader } from '@/components/PageHeader';
import { readPosts, resolveBlogCover } from '@/lib/blog';
import { BlogIndex, type PostMeta } from '@/components/BlogIndex';
import styles from './Blog.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Insights',
  description:
    'Notes from Ubunifu Technologies on building software for African businesses: product decisions, pricing, AI in Swahili, and what we are learning in Tanzania.',
  path: '/blog',
});

export default async function BlogPage() {
  const { posts, unavailable } = await readPosts();

  // Pass only what the client index needs (drop the heavy `content`).
  const meta: PostMeta[] = posts.map((post) => {
    const cover = resolveBlogCover(post);

    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
      author: post.author,
      tags: post.tags,
      readingTime: post.readingTime,
      coverImage: cover.image,
      coverAlt: cover.alt,
    };
  });

  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <PageHeader
          scene="journal"
          eyebrow="Insights"
          title="Articles"
          lead="Product decisions and lessons from building software in Tanzania."
        />
        <div className={`container ${styles.journal}`}>
          {unavailable ? (
            /* Not a dead end: the reader came here to read something of ours,
               so they leave with somewhere to go rather than an apology. */
            <div className={styles.empty}>
              <p>
                The articles are not loading at the moment. This is our end, not yours, and it is
                usually brief — refreshing in a minute or two normally does it.
              </p>
              <p>
                In the meantime there is <Link href="/work">the work we have done</Link> and{' '}
                <Link href="/build">what we actually do</Link>. If you were looking for something
                specific, <Link href="/contact">tell us</Link> and we will send it to you directly.
              </p>
            </div>
          ) : posts.length === 0 ? (
            <p className={styles.empty}>Nothing published yet. Check back soon.</p>
          ) : (
            <BlogIndex posts={meta} />
          )}
        </div>
      </main>
      <CtaBand />
    </>
  );
}
