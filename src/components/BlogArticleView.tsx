import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { EditorialVisual } from '@/components/EditorialVisual';
import { getProjectDiagram } from '@/content/project-visuals';
import type { BlogCover } from '@/content/blog-covers';
import { formatDateLong } from '@/lib/date';
import styles from '@/app/(site)/blog/[slug]/BlogSlug.module.css';

export type ArticleContent = {
  title: string;
  excerpt: string;
  author: string;
  /** A calendar date, YYYY-MM-DD. */
  date: string;
  readingTime: number;
  tags: string[];
  content: string;
};

/**
 * One article as a reader sees it: the header, the cover, the text and the
 * topics. The live post page and the console's preview both render this, so
 * what the editor shows is what the site will show.
 *
 * In a preview the links back to the journal are shown but not followed,
 * because the console does not serve the public pages.
 */
export function BlogArticleView({
  post,
  cover,
  preview = false,
}: {
  post: ArticleContent;
  cover: BlogCover;
  preview?: boolean;
}) {
  const back = (label: string, className: string) =>
    preview ? (
      <span className={className}>
        <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </span>
    ) : (
      <Link href="/blog" className={className}>
        <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </Link>
    );

  return (
    <article>
      <header className={`container ${styles.articleHero}`}>
        <div className={styles.header}>
          {/* No category pill. It was a tinted eyebrow micro-label — the
              pattern this brand removes everywhere else — and the same tags
              are already listed in the article footer. */}
          <div className={styles.headerTopline}>{back('All insights', styles.journalLink)}</div>

          <h1 className={styles.title}>{post.title}</h1>
          {post.excerpt && <p className={styles.dek}>{post.excerpt}</p>}

          <div className={styles.meta}>
            <span className={styles.author}>By {post.author}</span>
            <span className={styles.metaDot} aria-hidden="true" />
            <time className={styles.date} dateTime={post.date}>
              {formatDateLong(post.date)}
            </time>
            <span className={styles.metaDot} aria-hidden="true" />
            <span>{post.readingTime} min read</span>
          </div>
        </div>

        <figure className={styles.cover}>
          <EditorialVisual
            src={cover.image}
            alt={cover.alt}
            fill
            priority={!preview}
            sizes="(max-width: 1280px) 100vw, 1200px"
            className={styles.coverImage}
          />
          {!getProjectDiagram(cover.image) && (
            <figcaption className={styles.coverCaption}>Conceptual illustration</figcaption>
          )}
        </figure>
      </header>

      <div className={`container ${styles.articleContainer}`}>
        <div className={styles.content}>
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <footer className={styles.articleFooter}>
          <div className={styles.tagList} aria-label="Article topics">
            {post.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {back('Back to all articles', styles.backLink)}
        </footer>
      </div>
    </article>
  );
}
