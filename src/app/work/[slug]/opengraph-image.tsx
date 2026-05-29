import { projects, getProjectBySlug } from '@/content/portfolio';
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Ubunifu Technologies case study';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Prerender one OG image per case study at build time.
export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  return renderOgImage({
    eyebrow: 'Case study',
    title: project?.title ?? 'Our work',
    subtitle: project?.category,
  });
}
