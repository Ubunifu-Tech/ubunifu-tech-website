import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ArrowRight } from 'lucide-react';
import { projects, getProjectBySlug } from '@/content/portfolio';
import { testimonials } from '@/content/testimonials';
import { CtaBand } from '@/components/CtaBand';
import { MediaReveal } from '@/components/MediaReveal';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Testimonial } from '@/components/Testimonial';
import styles from './CaseStudy.module.css';

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: 'Project not found' };
  }

  const url = `https://ubunifutech.com/work/${project.slug}`;

  return {
    title: `${project.title} · Case study`,
    description: project.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${project.title} · Case study`,
      description: project.description,
      siteName: 'Ubunifu Technologies',
      // OG image provided by the colocated opengraph-image.tsx.
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} · Case study`,
      description: project.description,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const hasTestimonial = testimonials.some((t) => t.project === project.slug);

  // With a small portfolio, "next" is simply the next project in the list,
  // wrapping around to the first.
  const currentIndex = projects.findIndex((p) => p.slug === project.slug);
  const nextProject = projects[(currentIndex + 1) % projects.length];
  const showNextProject = projects.length > 1 && nextProject.slug !== project.slug;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.description,
    creator: {
      '@type': 'Organization',
      name: 'Ubunifu Technologies',
      url: 'https://ubunifutech.com',
    },
    about: project.category,
    url: `https://ubunifutech.com/work/${project.slug}`,
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroEdge} aria-hidden="true"><span /><span /></div>
        <div className={`container ${styles.heroInner}`}>
          <Link href="/work" className={styles.backLink}>
            <ArrowLeft size={16} />
            All work
          </Link>

          <div className={styles.heroTopline}>
            <span className={styles.category}>{project.category}</span>
            <span>{project.domain}</span>
          </div>
          <h1 className={styles.title}>{project.title}</h1>

          <div className={styles.heroSupport}>
            <div className={styles.heroBody}>
              {project.overview.map((paragraph) => (
                <p key={paragraph} className={styles.lead}>
                  {paragraph}
                </p>
              ))}
            </div>

            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.visitBtn}
            >
              Visit {project.domain}
              <ArrowUpRight size={16} aria-hidden="true" />
              <span className="srOnly"> (opens in a new tab)</span>
            </a>
          </div>

          <figure className={styles.shotFrame}>
            <div className={styles.shotTopline}>
              <span>Conceptual illustration</span>
              <span>{project.domain}</span>
            </div>
            <div className={styles.shotViewport}>
              <MediaReveal>
                <Image
                  src={project.artwork.src}
                  alt={project.artwork.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 1440px"
                  className={styles.shotImg}
                  priority
                />
              </MediaReveal>
            </div>
            <figcaption className={styles.caption}>
              {project.artwork.caption}. Visit the live site to experience the delivered work.
            </figcaption>
          </figure>
        </div>
      </header>

      {/* What we built */}
      <section className={`section ${styles.highlightsSection}`}>
        <div className="container">
          <ScrollReveal className={styles.sectionIntro}>
            <div>
              <span className="eyebrow">What we built</span>
              <h2 className={styles.sectionHeading}>Inside the build</h2>
            </div>
            <p>
              The work is documented as connected decisions—not a list of
              features detached from the operating problem.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <ol className={styles.highlightsGrid}>
              {project.highlights.map((highlight, index) => (
                <li key={highlight.title} className={styles.highlightCard}>
                  <span className={styles.highlightIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className={styles.highlightTitle}>{highlight.title}</h3>
                    <p className={styles.highlightBody}>{highlight.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      {/* Stack */}
      <section className={`section ${styles.stackSection}`}>
        <div className="container">
          <div className={styles.sectionIntro}>
            <div>
              <span className="eyebrow">The stack</span>
              <h2 className={styles.sectionHeading}>Built with</h2>
            </div>
            <p>Chosen for the work, maintained as one practical system.</p>
          </div>
          <ul className={styles.techList}>
            {project.tech.map((tech, index) => (
              <li key={tech} className={styles.techTag}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonial (if one exists for this project) */}
      {hasTestimonial && <Testimonial project={project.slug} />}

      {/* Next project */}
      {showNextProject && (
        <section className={`section ${styles.nextSection}`}>
          <div className="container">
            <Link href={`/work/${nextProject.slug}`} className={styles.nextCard}>
              <div className={styles.nextText}>
                <span className={styles.nextLabel}>Next project</span>
                <span className={styles.nextTitle}>{nextProject.title}</span>
                <span className={styles.nextCategory}>{nextProject.category}</span>
              </div>
              <div className={styles.nextThumb}>
                <MediaReveal>
                  <Image
                    src={nextProject.artwork.src}
                    alt={nextProject.artwork.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.nextThumbImg}
                  />
                </MediaReveal>
                <span className={styles.nextArtLabel}>Conceptual illustration</span>
              </div>
              <span className={styles.nextArrow} aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            </Link>
          </div>
        </section>
      )}

      <CtaBand />
    </main>
  );
}
