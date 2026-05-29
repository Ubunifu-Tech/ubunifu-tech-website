import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import { projects, getProjectBySlug } from '@/content/portfolio';
import { testimonials } from '@/content/testimonials';
import { Navbar } from '@/components/Navbar';
import { CtaBand } from '@/components/CtaBand';
import { Footer } from '@/components/Footer';
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
      <Navbar />

      {/* Hero */}
      <header className={styles.hero}>
        <div className="container">
          <Link href="/work" className={styles.backLink}>
            <ArrowLeft size={16} />
            All work
          </Link>

          <span className={styles.category}>{project.category}</span>
          <h1 className={styles.title}>{project.title}</h1>

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
            <ArrowUpRight size={16} />
          </a>
        </div>
      </header>

      {/* Primary screenshot */}
      <section className="container">
        <figure className={styles.shotFrame}>
          <div className={styles.browserBar}>
            <span className={styles.dot} style={{ background: '#ff5f57' }} />
            <span className={styles.dot} style={{ background: '#febc2e' }} />
            <span className={styles.dot} style={{ background: '#28c840' }} />
            <div className={styles.urlBar}>
              <span aria-hidden="true">🔒</span>
              {project.domain}
            </div>
          </div>
          <div className={styles.shotViewport}>
            <Image
              src={project.primary.src}
              alt={project.primary.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className={styles.shotImg}
              priority
            />
          </div>
          {project.primary.caption && (
            <figcaption className={styles.caption}>
              {project.primary.caption}
            </figcaption>
          )}
        </figure>
      </section>

      {/* What we built */}
      <section className={`section ${styles.highlightsSection}`}>
        <div className="container">
          <span className="eyebrow">What we built</span>
          <h2 className={styles.sectionHeading}>Inside the build</h2>
          <div className={styles.highlightsGrid}>
            {project.highlights.map((highlight) => (
              <div key={highlight.title} className={styles.highlightCard}>
                <div className={styles.highlightIcon} aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </div>
                <h3 className={styles.highlightTitle}>{highlight.title}</h3>
                <p className={styles.highlightBody}>{highlight.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      {project.gallery && project.gallery.length > 0 && (
        <section className={`section ${styles.gallerySection}`}>
          <div className="container">
            <div className={styles.gallery}>
              {project.gallery.map((shot) => (
                <figure key={shot.src} className={styles.galleryItem}>
                  <div className={styles.galleryViewport}>
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={styles.shotImg}
                    />
                  </div>
                  {shot.caption && (
                    <figcaption className={styles.caption}>{shot.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stack */}
      <section className={`section ${styles.stackSection}`}>
        <div className="container">
          <span className="eyebrow">The stack</span>
          <h2 className={styles.sectionHeading}>Built with</h2>
          <ul className={styles.techList}>
            {project.tech.map((tech) => (
              <li key={tech} className={styles.techTag}>
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
                <Image
                  src={nextProject.primary.src}
                  alt={nextProject.primary.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className={styles.nextThumbImg}
                />
              </div>
              <span className={styles.nextArrow} aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            </Link>
          </div>
        </section>
      )}

      <CtaBand />
      <Footer />
    </main>
  );
}
