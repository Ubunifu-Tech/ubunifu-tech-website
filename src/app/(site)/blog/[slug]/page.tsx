import { EditorialVisual } from '@/components/EditorialVisual';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { CtaBand } from '@/components/CtaBand';
import { ReadingProgress } from '@/components/ReadingProgress';
import { getProjectDiagram } from '@/content/project-visuals';
import { readPost, readPosts, resolveBlogCover } from '@/lib/blog';
import { formatDateLong } from '@/lib/date';
import styles from './BlogSlug.module.css';

const SITE_URL = 'https://ubunifutech.com';
function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Re-rendered at most every five minutes, as well as the moment anything is
 * published. The publish action already revalidates this page — but a post
 * given a FUTURE date is published now and goes live later, and at that later
 * moment nobody presses anything. Without a time-based revalidate it simply
 * never appeared. Five minutes is also how long a page rendered during a
 * database outage keeps saying so before it tries again.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  // An unreachable journal prerenders nothing rather than failing the build.
  // dynamicParams stays on, so every post still renders on first request.
  const { posts } = await readPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { post, unavailable } = await readPost(slug);

  if (!post) {
    // "Not found" is a claim about the world. Only make it when we actually
    // asked and the answer was no.
    return unavailable
      ? { title: 'This article is not loading', robots: { index: false } }
      : { title: 'Post not found' };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const cover = resolveBlogCover(post);
  const coverUrl = absoluteUrl(cover.image);
  const publishedTime = `${post.date}T00:00:00.000Z`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author, url: SITE_URL }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.excerpt,
      siteName: 'Ubunifu Technologies',
      publishedTime,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: coverUrl,
          width: 1672,
          height: 941,
          alt: cover.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [{ url: coverUrl, alt: cover.alt }],
    },
  };
}

/**
 * What a reader gets when the journal cannot be reached.
 *
 * Deliberately not a 404 and deliberately not an apology with nowhere to go:
 * somebody followed a link to read something of ours, so the page says plainly
 * whose problem it is and offers the two things they might have wanted instead.
 */
function ArticleUnavailable() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <div className={`container ${styles.articleContainer}`}>
          <div className={styles.content}>
            <h1>This article is not loading</h1>
            <p>
              Something on our side is not answering. It is usually brief — trying again in a
              minute or two normally does it, and the link you followed is still good.
            </p>
            <p>
              <Link href="/blog">Everything else we have written</Link> ·{' '}
              <Link href="/work">the work we have done</Link> ·{' '}
              <Link href="/contact">ask us for it directly</Link>
            </p>
          </div>
        </div>
      </main>
      <CtaBand />
    </>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { post, unavailable } = await readPost(slug);

  // A database that cannot be reached is not a missing article. Returning a
  // 404 here would tell the reader something untrue, and Next would cache it.
  if (unavailable) {
    return <ArticleUnavailable />;
  }

  if (!post) {
    notFound();
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const publishedTime = `${post.date}T00:00:00.000Z`;
  const cover = resolveBlogCover(post);
  const coverUrl = absoluteUrl(cover.image);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: postUrl,
    datePublished: publishedTime,
    dateModified: publishedTime,
    inLanguage: 'en',
    articleSection: post.tags[0],
    keywords: post.tags,
    image: {
      '@type': 'ImageObject',
      url: coverUrl,
      width: 1672,
      height: 941,
      caption: cover.alt,
    },
    author: {
      '@type': post.author === 'Ubunifu Technologies' ? 'Organization' : 'Person',
      name: post.author,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ubunifu Technologies',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-v2.png`,
        width: 512,
        height: 512,
      },
    },
    isPartOf: {
      '@type': 'Blog',
      name: 'Ubunifu Insights',
      url: `${SITE_URL}/blog`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <ReadingProgress />

        <article>
          <header className={`container ${styles.articleHero}`}>
            <div className={styles.header}>
              {/* No category pill. It was a tinted eyebrow micro-label — the
                  pattern this brand removes everywhere else — and the same tags
                  are already listed in the article footer. */}
              <div className={styles.headerTopline}>
                <Link href="/blog" className={styles.journalLink}>
                  <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
                  All insights
                </Link>
              </div>

              <h1 className={styles.title}>{post.title}</h1>
              <p className={styles.dek}>{post.excerpt}</p>

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
                priority
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
              <Link href="/blog" className={styles.backLink}>
                <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
                Back to all articles
              </Link>
            </footer>
          </div>
        </article>

        <CtaBand />
      </main>
    </>
  );
}
