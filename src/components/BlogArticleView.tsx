import Image from 'next/image';
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
  /** The writer's public profile, when the byline has one. */
  writer?: { role?: string; bio?: string; link?: string; photo?: string };
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
            <span className={styles.author}>
              By {post.author}
              {post.writer?.role && <span className={styles.authorRole}>, {post.writer.role}</span>}
            </span>
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

        {post.writer && (post.writer.bio || post.writer.photo || post.writer.link) && (
          <aside className={styles.writer} aria-label="About the writer">
            {post.writer.photo ? (
              <Image
                src={post.writer.photo}
                alt=""
                width={64}
                height={64}
                className={styles.writerPhoto}
              />
            ) : (
              <span className={styles.writerInitials} aria-hidden="true">
                {initialsOf(post.author)}
              </span>
            )}
            <div className={styles.writerText}>
              <p className={styles.writerName}>
                {post.author}
                {post.writer.role && <span className={styles.writerRole}>{post.writer.role}</span>}
              </p>
              {post.writer.bio && <p className={styles.writerBio}>{post.writer.bio}</p>}
              {post.writer.link && (
                <a
                  href={post.writer.link}
                  className={styles.writerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hostOf(post.writer.link)}
                </a>
              )}
            </div>
          </aside>
        )}

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

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1]![0] : '')).toUpperCase();
}

/** "https://www.example.com/about" reads as "example.com". */
function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}
