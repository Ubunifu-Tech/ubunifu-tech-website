import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getAllPosts } from '@/lib/blog';
import styles from './Blog.module.css';

export const metadata = {
  title: 'Blog',
  description:
    'Notes from Ubunifu Technologies on building software for African businesses - product decisions, pricing, and what we are learning in Tanzania.',
};

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <span className="eyebrow">Blog</span>
            <h1 className={styles.heading}>Notes from the team</h1>
            <p className={styles.subheading}>
              Thoughts on building software for African businesses - product
              decisions, pricing, and what we are learning in Tanzania.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className={styles.empty}>No posts published yet - check back soon.</p>
          ) : (
            <div className={styles.grid}>
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className={styles.card}
                >
                  <div className={styles.meta}>
                    <span className={styles.date}>{formatDate(post.date)}</span>
                    {post.tags.length > 0 && (
                      <span className={styles.tags}>{post.tags.join(' · ')}</span>
                    )}
                  </div>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.author}>{post.author}</span>
                    <span className={styles.readMore}>
                      Read article
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
