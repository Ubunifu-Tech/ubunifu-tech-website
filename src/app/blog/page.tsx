import { CtaBand } from '@/components/CtaBand';
import { getAllPosts, resolveBlogCover } from '@/lib/blog';
import { BlogIndex, type PostMeta } from '@/components/BlogIndex';
import styles from './Blog.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Journal',
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
        <div className={`container ${styles.journal}`}>
          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <span className="specLabel">The journal</span>
              <h1 className={styles.heading}>Notes from the workshop</h1>
              <p className={styles.subheading}>
                We write when we have something worth saying: about building
                software in Tanzania, the decisions behind our products, and what
                the work actually teaches us. No content calendar, no filler.
              </p>
            </div>
            <aside className={styles.headerNote} aria-label="About the Ubunifu journal">
              <span className={styles.headerNoteLabel}>
                {String(posts.length).padStart(2, '0')} published notes
              </span>
              <p>
                Product decisions, delivery lessons, and observations from
                building digital systems in context.
              </p>
            </aside>
          </header>

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
