'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { AmbientShader, type ShaderCharacter } from './AmbientShader';
import { EditorialVisual } from './EditorialVisual';
import {
  CapabilityOrbitGraphic,
  EngagementPathGraphic,
  HomeHeroGraphic,
} from './HomeLandingVisuals';
import { cta, site } from '@/content/site';
import { pillars } from '@/content/pillars';
import { principleArtwork } from '@/content/principle-artwork';
import { services, type ServiceKey } from '@/content/services';
import { projects } from '@/content/portfolio';
import { products } from '@/content/products';
import { productArtwork } from '@/content/product-artwork';
import { testimonials } from '@/content/testimonials';
import { formatDateShort } from '@/lib/date';
import { useState } from 'react';
import styles from './HomeLanding.module.css';
import { displayHost } from '@/lib/url';

export type HomeInsight = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  image: string;
  alt: string;
};

const HERO_SHADER: ShaderCharacter = {
  colors: ['#FFFFFF', '#F3EEFF', '#FFF1EA', '#FFFFFF', '#E8DFFF'],
  distortion: 0.68,
  swirl: 0.18,
  speed: 0.055,
};

const CTA_SHADER: ShaderCharacter = {
  colors: ['#FFF4EE', '#FFFFFF', '#EDE6FF', '#FFFFFF', '#F7E9FF'],
  distortion: 0.76,
  swirl: 0.24,
  speed: 0.06,
};

const ENGAGEMENT_PATHS = [
  {
    key: 'consulting' as const,
    title: 'Something built for how you work',
    body: 'Bring us the workflow, decision, or system that needs to work better. We shape the approach, build the answer, and agree what happens after launch.',
    bestWhenLead: 'Best when the work is',
    bestWhenEmphasis: 'specific to how your organisation runs',
    href: '/build',
    linkLabel: 'Explore our services',
  },
  {
    key: 'products' as const,
    title: 'Something that already runs',
    body: 'Some problems are common enough that we have already built the software and now operate it ourselves. You use what exists, with hosting and maintenance handled.',
    bestWhenLead: 'Best when the workflow is',
    bestWhenEmphasis: 'one many businesses already share',
    href: '/products',
    linkLabel: 'See our products',
  },
] as const;

export function HomeLanding({ posts }: { posts: HomeInsight[] }) {
  const [activeKey, setActiveKey] = useState<ServiceKey | null>(null);
  const [activePillarKey, setActivePillarKey] = useState(pillars[0]?.key ?? 'local');
  const activeService = activeKey
    ? services.find((service) => service.key === activeKey)
    : undefined;
  const activePillarIndex = Math.max(
    pillars.findIndex((pillar) => pillar.key === activePillarKey),
    0,
  );
  const activePillar = pillars[activePillarIndex];
  const activePrincipleArtwork = principleArtwork[activePillar.key];
  const testimonial = testimonials[0];
  const liveProducts = products.filter((product) => product.status === 'live');
  const upcomingProducts = products.filter((product) => product.status !== 'live');

  return (
    <main className={styles.page} data-home-redesign data-atmosphere>
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <AmbientShader placement="panelTall" character={HERO_SHADER} />
        <div className={styles.heroWash} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 id="home-hero-title" className={styles.heroTitle}>
              Build the system your organisation{' '}
              <span>actually needs.</span>
            </h1>
            <p className={styles.heroLead}>
              We help Tanzanian organisations make technology decisions, then advise,
              design, build, host, and support the result. We also build and operate
              software products of our own.
            </p>
            <div className={styles.heroActions}>
              <Link href="/contact" className={styles.primaryButton}>
                {cta.primary}
                <ArrowRight aria-hidden="true" size={19} strokeWidth={1.8} />
              </Link>
              <Link href="/work" className={styles.secondaryButton}>
                {cta.secondary}
                <ArrowUpRight aria-hidden="true" size={19} strokeWidth={1.8} />
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <HomeHeroGraphic />
          </div>
        </div>
      </section>

      <section className={styles.principles} aria-labelledby="home-principles-title">
        <div className={styles.sectionInner}>
          <h2 id="home-principles-title" className={styles.statement}>
            We understand locally, ship real work,{' '}
            <span>use AI deliberately</span>, and stay accountable after launch.
          </h2>

          <div className={styles.principlesLayout}>
            <figure
              id="principle-panel"
              className={styles.principleStage}
              aria-labelledby={`principle-control-${activePillar.key}`}
              aria-live="polite"
            >
              <div className={styles.principleCanvas}>
                <Image
                  key={activePrincipleArtwork.src}
                  src={activePrincipleArtwork.src}
                  alt={activePrincipleArtwork.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 58vw"
                  className={styles.principleImage}
                />
              </div>
              <figcaption className={styles.principleStageMeta}>
                <span aria-hidden="true">
                  {String(activePillarIndex + 1).padStart(2, '0')} / {String(pillars.length).padStart(2, '0')}
                </span>
                <span className={styles.principleProgress} aria-hidden="true">
                  {pillars.map((pillar, index) => (
                    <span
                      key={pillar.key}
                      className={index === activePillarIndex ? styles.principleProgressActive : undefined}
                    />
                  ))}
                </span>
              </figcaption>
            </figure>

            <ul className={styles.principleList}>
              {pillars.map((pillar, index) => (
                <li
                  key={pillar.key}
                  className={`${styles.principleItem} ${activePillarKey === pillar.key ? styles.principleItemActive : ''}`}
                  onMouseEnter={() => setActivePillarKey(pillar.key)}
                >
                  <button
                    id={`principle-control-${pillar.key}`}
                    type="button"
                    className={styles.principleButton}
                    aria-pressed={activePillarKey === pillar.key}
                    aria-controls="principle-panel"
                    onClick={() => setActivePillarKey(pillar.key)}
                    onFocus={() => setActivePillarKey(pillar.key)}
                  >
                    <span className={styles.principleNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.principleCopy}>
                      <span className={styles.principleTitle}>{pillar.title}</span>
                      <span className={styles.principleProof}>{pillar.proof}</span>
                    </span>
                    <ArrowRight className={styles.principleArrow} aria-hidden="true" size={19} strokeWidth={1.8} />
                  </button>
                  {activePillarKey === pillar.key && (
                    <>
                      <div className={styles.principleMobileVisual}>
                        <Image
                          src={principleArtwork[pillar.key].src}
                          alt={principleArtwork[pillar.key].alt}
                          fill
                          sizes="calc(100vw - 6rem)"
                          className={styles.principleImage}
                        />
                      </div>
                      <Link href={pillar.href}>
                        {pillar.linkLabel}
                        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="home-capabilities-title">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <h2 id="home-capabilities-title">
              What we <span>do</span>
            </h2>
            <p>We design, build, and maintain the technology your business uses.</p>
          </div>

          <div className={styles.capabilityLayout}>
            <div className={styles.capabilityStage}>
              <CapabilityOrbitGraphic activeKey={activeKey} />
              <div className={styles.capabilityReadout} aria-live="polite">
                <h3>{activeService ? activeService.title : 'Six capabilities, one team'}</h3>
                {activeService ? (
                  <ul>
                    {activeService.items.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Point at a service to see what it covers.</p>
                )}
              </div>
            </div>

            <ul className={styles.capabilityList} onMouseLeave={() => setActiveKey(null)}>
              {services.map((service, index) => (
                <li key={service.key}>
                  <Link
                    href={`/build#${service.key}`}
                    className={activeKey === service.key ? styles.capabilityLinkActive : undefined}
                    onMouseEnter={() => setActiveKey(service.key)}
                    onFocus={() => setActiveKey(service.key)}
                    onBlur={() => setActiveKey(null)}
                  >
                    <span className={styles.capabilityIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.capabilityName}>{service.title}</span>
                    <span className={styles.capabilitySummary}>{service.summary}</span>
                    <ArrowRight aria-hidden="true" size={20} strokeWidth={1.7} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.engagement} aria-labelledby="home-engagement-title">
        <div className={styles.sectionInner}>
          <div className={styles.engagementHead}>
            <h2 id="home-engagement-title">
              Do you need something built, or{' '}
              <span>something that already runs</span>?
            </h2>
            <p>
              Both are things we do. The right one depends on how particular the
              problem is to you.
            </p>
          </div>

          <div className={styles.engagementGrid}>
            {ENGAGEMENT_PATHS.map((path) => (
              <article key={path.key} className={styles.engagementCard} data-path={path.key}>
                <div className={styles.engagementVisual}>
                  <EngagementPathGraphic kind={path.key} />
                </div>
                <div className={styles.engagementBody}>
                  <h3>{path.title}</h3>
                  <p>{path.body}</p>
                  <p className={styles.bestWhen}>
                    {path.bestWhenLead} <strong>{path.bestWhenEmphasis}</strong>.
                  </p>
                  <Link href={path.href}>
                    {path.linkLabel}
                    <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.work} aria-labelledby="home-work-title">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <h2 id="home-work-title">
              Selected <span>work</span>
            </h2>
            <p>Websites and booking systems for two Tanzanian tourism businesses.</p>
          </div>

          <div className={styles.workGrid}>
            {projects.map((project) => (
              <article key={project.slug} className={styles.workItem}>
                <Link href={`/work/${project.slug}`} className={styles.workImageLink}>
                  <EditorialVisual
                    src={project.artwork.src}
                    alt={project.artwork.alt}
                    fill
                    sizes="(max-width: 860px) 100vw, 50vw"
                    className={styles.workImage}
                  />
                </Link>
                <p className={styles.workCategory}>{project.category}</p>
                <h3>{project.title}</h3>
                <Link href={`/work/${project.slug}`} className={styles.textLink}>
                  View case study
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                </Link>
              </article>
            ))}
          </div>

          <Link href="/work" className={styles.sectionLink}>
            See all work
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      {testimonial && (
        <section className={styles.testimonial} aria-labelledby="home-testimonial-title">
          <div className={styles.sectionInner}>
            <h2 id="home-testimonial-title" className="srOnly">
              Client feedback
            </h2>
            <figure className={styles.testimonialFigure}>
              <span className={styles.quoteMark} aria-hidden="true">
                “
              </span>
              <blockquote>{testimonial.pullQuote}</blockquote>
              <figcaption>
                <div>
                  <p className={styles.testimonialOrg}>{testimonial.organization}</p>
                  <p>
                    {testimonial.authorName} · {testimonial.authorRole}
                  </p>
                </div>
                <div className={styles.testimonialLinks}>
                  {testimonial.organizationUrl && (
                    <a
                      href={testimonial.organizationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {displayHost(testimonial.organizationUrl)}
                      <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />
                      <span className="srOnly"> (opens in a new tab)</span>
                    </a>
                  )}
                  {testimonial.project && (
                    <Link href={`/work/${testimonial.project}`}>
                      Read the case study
                      <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                    </Link>
                  )}
                </div>
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      <section className={styles.products} aria-labelledby="home-products-title">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <h2 id="home-products-title">
              Our <span>products</span>
            </h2>
            <p>Software we build, operate, and continue to improve.</p>
          </div>

          <div className={styles.productGrid}>
            {liveProducts.map((product) => (
              <a
                key={product.id}
                href={product.url ?? '/products'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.productCard}
                data-product={product.id}
              >
                <div className={styles.productVisual}>
                  <Image
                    src={productArtwork[product.id].src}
                    alt={productArtwork[product.id].alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    className={styles.productImage}
                  />
                </div>
                <div className={styles.productBody}>
                  <span className={styles.liveStatus}>
                    <span aria-hidden="true" />
                    Live
                  </span>
                  <h3>{product.name}</h3>
                  <p>{product.tagline}</p>
                  <span className={styles.productAddress}>
                    {product.domain}
                    <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.8} />
                    <span className="srOnly"> (opens in a new tab)</span>
                  </span>
                </div>
              </a>
            ))}
          </div>

          {upcomingProducts.map((product) => (
            <Link key={product.id} href="/products" className={styles.upcomingProduct}>
              <span>In development</span>
              <strong>{product.name}</strong>
              <span>{product.tagline}</span>
              <ArrowRight aria-hidden="true" size={19} strokeWidth={1.8} />
            </Link>
          ))}

          <Link href="/products" className={styles.sectionLink}>
            Explore all products
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      {posts.length > 0 && (
        <section className={styles.insights} aria-labelledby="home-insights-title">
          <div className={styles.sectionInner}>
            <div className={styles.insightsHead}>
              <h2 id="home-insights-title">
                Recent <span>writing</span>
              </h2>
              <Link href="/blog">
                All articles
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </Link>
            </div>

            <div className={styles.insightGrid}>
              {posts.map((post) => (
                <article key={post.slug} className={styles.insightCard}>
                  <Link href={`/blog/${post.slug}`} className={styles.insightImageLink}>
                    <EditorialVisual
                      src={post.image}
                      alt={post.alt}
                      fill
                      sizes="(max-width: 820px) 100vw, 33vw"
                      className={styles.insightImage}
                    />
                  </Link>
                  <div className={styles.insightMeta}>
                    <time dateTime={post.date}>{formatDateShort(post.date)}</time>
                    {post.tags[0] && <span>{post.tags[0]}</span>}
                  </div>
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p>{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className={styles.textLink}>
                    <span className="srOnly">Read {post.title}</span>
                    <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={styles.closing} aria-labelledby="home-closing-title">
        <AmbientShader placement="panelTall" character={CTA_SHADER} />
        <div className={styles.closingWash} aria-hidden="true" />
        <div className={`${styles.sectionInner} ${styles.closingInner}`}>
          <h2 id="home-closing-title">Have a project in mind?</h2>
          <div>
            <p>Tell us what you need. We can discuss the scope, timing, and budget.</p>
            <Link href={site.urls.contact} className={styles.primaryButton}>
              {cta.primary}
              <ArrowRight aria-hidden="true" size={19} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
