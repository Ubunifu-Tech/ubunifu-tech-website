import { notFound } from 'next/navigation';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import Link from 'next/link';
import { EditorialVisual } from '@/components/EditorialVisual';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ArrowRight } from 'lucide-react';
import { projects, getProjectBySlug } from '@/content/portfolio';
import { testimonials } from '@/content/testimonials';
import { CtaBand } from '@/components/CtaBand';
import { MediaReveal } from '@/components/MediaReveal';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Testimonial } from '@/components/Testimonial';
import { AmbientShader } from '@/components/AmbientShader';
import { sectionId } from '@/lib/slug';
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
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Masthead. The only dark surface on the site that lacked the ambient
            layer; it self-gates off under reduced motion and on weak hardware, so
            this block must read complete without it. */}
        <header className={styles.hero}>
          <AmbientShader placement="edges" />
          <div className={`container ${styles.heroInner}`}>
            <Link href="/work" className={styles.backLink}>
              <ArrowLeft size={16} />
              All work
            </Link>

            <div className={styles.masthead}>
              <div className={styles.mastheadRail}>
                <span className={styles.category}>{project.category}</span>
                <span className={styles.domain}>{project.domain}</span>
              </div>

              <div className={styles.mastheadMeasure}>
                <h1 className={styles.title}>{project.title}</h1>
                <p className={styles.standfirst}>{project.overview[0]}</p>
                {project.overview[1] && (
                  <p className={styles.mastheadFoot}>{project.overview[1]}</p>
                )}
              </div>

              <div className={styles.mastheadMargin}>
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
            </div>
          </div>
        </header>

        {/* The plate sits on light ground: the diagram draws its own dark field, so
            on the dark masthead it had no edge at all. */}
        <section className={styles.plateSection}>
          <div className={`container ${styles.spine}`}>
            <figure className={styles.plateFigure}>
              <figcaption className={styles.plateCaption}>
                <span>{project.artwork.alt}</span>
                <span className={styles.plateNote}>
                  Diagram of the system, not a capture of the interface.
                </span>
              </figcaption>
              <div className={styles.plateViewport}>
                <MediaReveal>
                  <EditorialVisual
                    src={project.artwork.src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 1056px"
                    className={styles.plateArt}
                    priority
                  />
                </MediaReveal>
              </div>
            </figure>
          </div>
        </section>

        {/* Article. Exactly three direct grid children, so the layout never depends
            on how many highlights a project happens to have. */}
        <section className={styles.articleSection}>
          <div className={`container ${styles.spine}`}>
            <div className={styles.rail}>
              <p className={styles.railLabel}>Built with</p>
              <ul className={styles.colophon}>
                {project.tech.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
              <ul className={styles.scope}>
                {project.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>

            <div className={styles.measure}>
              <ScrollReveal>
                <h2 className={styles.sectionHeading}>{project.sectionHeading}</h2>
                <p className={styles.sectionStandfirst}>{project.sectionStandfirst}</p>
              </ScrollReveal>

              {project.highlights.map((highlight) => (
                <section
                  key={highlight.title}
                  id={sectionId(highlight.title)}
                  className={styles.highlight}
                >
                  <h3 className={styles.highlightTitle}>{highlight.title}</h3>
                  <p className={styles.highlightBody}>{highlight.body}</p>
                </section>
              ))}

              {project.furtherReading?.length ? (
                <p className={styles.further}>
                  {project.furtherReading.map((item) => (
                    <Link key={item.href} href={item.href} className={styles.furtherLink}>
                      {item.title} <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>

            <aside className={styles.margin}>
              <p className={styles.pullQuote}>{project.pullQuote}</p>
            </aside>
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
                    <EditorialVisual
                      src={nextProject.artwork.src}
                      alt={nextProject.artwork.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      className={styles.nextThumbImg}
                    />
                  </MediaReveal>
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
    </>
  );
}
