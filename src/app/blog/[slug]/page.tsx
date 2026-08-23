import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { CtaBand } from '@/components/CtaBand';
import { ReadingProgress } from '@/components/ReadingProgress';
import { getAllPosts, getPostBySlug, resolveBlogCover } from '@/lib/blog';
import styles from './BlogSlug.module.css';

const SITE_URL = 'https://ubunifutech.com';
const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? date : longDate.format(parsed);
}

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

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post not found' };
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

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
      name: 'The Ubunifu Journal',
      url: `${SITE_URL}/blog`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return (
    <main className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ReadingProgress />

      <article>
        <header className={`container ${styles.articleHero}`}>
          <div className={styles.header}>
            <div className={styles.headerTopline}>
              <Link href="/blog" className={styles.journalLink}>
                <span aria-hidden="true">←</span> The journal
              </Link>
              {post.tags[0] ? <span className={styles.category}>{post.tags[0]}</span> : null}
            </div>

            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.dek}>{post.excerpt}</p>

            <div className={styles.meta}>
              <span className={styles.author}>By {post.author}</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <time className={styles.date} dateTime={post.date}>
                {formatDate(post.date)}
              </time>
              <span className={styles.metaDot} aria-hidden="true" />
              <span>{post.readingTime} min read</span>
            </div>
          </div>

          <figure className={styles.cover}>
            <Image
              src={cover.image}
              alt={cover.alt}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className={styles.coverImage}
            />
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
              <span aria-hidden="true">←</span> Back to all articles
            </Link>
          </footer>
        </div>
      </article>

      <CtaBand />
    </main>
  );
}
