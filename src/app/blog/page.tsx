import { CtaBand } from '@/components/CtaBand';
import { getAllPosts } from '@/lib/blog';
import { BlogIndex, type PostMeta } from '@/components/BlogIndex';
import styles from './Blog.module.css';

export const metadata = {
  title: 'Journal',
  description:
    'Notes from Ubunifu Technologies on building software for African businesses: product decisions, pricing, AI in Swahili, and what we are learning in Tanzania.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  // Pass only what the client index needs (drop the heavy `content`).
  const meta: PostMeta[] = posts.map(({ slug, title, excerpt, date, author, tags, readingTime }) => ({
    slug,
    title,
    excerpt,
    date,
    author,
    tags,
    readingTime,
  }));

  return (
    <>
      <main className={styles.main}>
        <div className="container">
          <header className={styles.header}>
            <span className="specLabel">The journal</span>
            <h1 className={styles.heading}>Notes from the workshop</h1>
            <p className={styles.subheading}>
              We write when we have something worth saying: about building
              software in Tanzania, the decisions behind our products, and what
              the work actually teaches us. No content calendar, no filler.
            </p>
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
