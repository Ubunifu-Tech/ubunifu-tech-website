import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { getAllPosts, resolveBlogCover } from '@/lib/blog';
import { BlogIndex, type PostMeta } from '@/components/BlogIndex';
import styles from './Blog.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Insights',
  description:
    'Notes from Ubunifu Technologies on building software for African businesses: product decisions, pricing, AI in Swahili, and what we are learning in Tanzania.',
  path: '/blog',
});

export default function BlogPage() {
  const posts = getAllPosts();

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
      <main className={styles.main}>
        <PageHeader
          scene="journal"
          compact
          eyebrow="Insights"
          title="Articles"
          lead="Product decisions and lessons from building software in Tanzania."
        />
        <div className={`container ${styles.journal}`}>
          {posts.length === 0 ? (
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
