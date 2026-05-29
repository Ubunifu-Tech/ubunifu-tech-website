import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Ubunifu Technologies blog post';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Prerender one OG image per post at build time so the bundled fonts are
// read while the source tree is present (avoids runtime file access).
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return renderOgImage({
    eyebrow: 'Blog',
    title: post?.title ?? 'Ubunifu Technologies',
  });
}
