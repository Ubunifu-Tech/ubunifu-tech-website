'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { services, type Service, type ServiceKey } from '@/content/services';
import styles from './CapabilityJourney.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

type CapabilityMedia = {
  src: string;
  alt: string;
  note: string;
};

const media: Record<ServiceKey, CapabilityMedia> = {
  web: {
    src: '/editorial/usambara-enquiry-journey-v2.webp',
    alt: 'Editorial illustration of destination discovery becoming a structured enquiry path',
    note: 'Conceptual illustration · Discovery to enquiry',
  },
  hosting: {
    src: '/editorial/hosting-system-art.webp',
    alt: 'Connected hosting, domain, email, backup, and security infrastructure',
    note: 'Conceptual illustration · Hosting, domains, email, and backups',
  },
  branding: {
    src: '/editorial/brand-system-art.webp',
    alt: 'A visual identity applied coherently across print and digital touchpoints',
    note: 'Conceptual illustration · One identity across working touchpoints',
  },
  data: {
    src: '/editorial/data-to-decisions.webp',
    alt: 'Editorial illustration of scattered records becoming a clear, connected decision system',
    note: 'Conceptual illustration · Records to decisions',
  },
  ai: {
    src: '/editorial/swahili-learning.webp',
    alt: 'Editorial illustration of source material, language, and review converging into a grounded answer',
    note: 'Conceptual illustration · Source to grounded answer',
  },
  strategy: {
    src: '/editorial/software-tanzania-learning.webp',
    alt: 'Research, decisions, and modular parts becoming a working system',
    note: 'Conceptual illustration · Understand, shape, build, and operate',
  },
};

type ChapterProps = {
  service: Service;
  index: number;
  onActive: (index: number) => void;
  reduceMotion: boolean;
};

const CapabilityChapter: React.FC<ChapterProps> = ({
  service,
  index,
  onActive,
  reduceMotion,
}) => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: '-34% 0px -42% 0px' });
  const visual = media[service.key];

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <motion.article
      ref={ref}
      id={service.key}
      className={styles.chapter}
      initial={reduceMotion ? false : { opacity: 0.35 }}
      whileInView={{ opacity: 1 }}
      viewport={{ amount: 0.38 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
    >
      <div className={styles.mobileVisual}>
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          sizes="(max-width: 980px) calc(100vw - 2.5rem), 1px"
          className={styles.image}
        />
        <span>{visual.note}</span>
      </div>

      <div className={styles.chapterTopline}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <span>{service.summary}</span>
      </div>
      <h3>{service.title}</h3>
      <p className={styles.description}>{service.description}</p>
      <ul className={styles.outcomes} aria-label={`${service.title} can include`}>
        {service.items.map((item, itemIndex) => (
          <li key={item}>
            <span>{String(itemIndex + 1).padStart(2, '0')}</span>
            {item}
          </li>
        ))}
      </ul>
    </motion.article>
  );
};

export const CapabilityJourney: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = Boolean(useReducedMotion());
  const activeService = services[activeIndex];
  const activeMedia = media[activeService.key];

  return (
    <section className={styles.section} aria-labelledby="capability-journey-title">
      <div className="container">
        <motion.header
          className={styles.intro}
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.58, ease }}
        >
          <p className={styles.eyebrow}>Where we can help</p>
          <h2 id="capability-journey-title">
            Choose the capability your organisation needs now.
          </h2>
          <p>
            A focused brief can stay focused. When the problem crosses brand,
            infrastructure, software, data, or operations, the same team can
            bring those disciplines into one scope.
          </p>
        </motion.header>

        <div className={styles.layout}>
          <aside className={styles.stageColumn} aria-label="Capability visual index">
            <div className={styles.stageSticky}>
              <div className={styles.stage}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.figure
                    key={activeService.key}
                    className={styles.figure}
                    initial={reduceMotion ? false : { opacity: 0, scale: 1.025 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.52, ease }}
                  >
                    <Image
                      src={activeMedia.src}
                      alt={activeMedia.alt}
                      fill
                      sizes="(max-width: 980px) 100vw, 54vw"
                      className={styles.image}
                    />
                    <span className={styles.veil} aria-hidden="true" />
                    <figcaption>{activeMedia.note}</figcaption>
                  </motion.figure>
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={`number-${activeIndex}`}
                    className={styles.stageNumber}
                    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                    transition={{ duration: reduceMotion ? 0 : 0.4, ease }}
                    aria-hidden="true"
                  >
                    {String(activeIndex + 1).padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
                <div className={styles.brandRail} aria-hidden="true"><span /><span /></div>
              </div>

              <nav className={styles.index} aria-label="Jump to a capability">
                {services.map((service, index) => {
                  const active = index === activeIndex;
                  return (
                    <Link
                      key={service.key}
                      href={`#${service.key}`}
                      className={active ? styles.indexActive : ''}
                      aria-current={active ? 'location' : undefined}
                      onClick={() => setActiveIndex(index)}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {service.title}
                      {active && (
                        <motion.i
                          layoutId="capability-journey-marker"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className={styles.chapters}>
            {services.map((service, index) => (
              <CapabilityChapter
                key={service.key}
                service={service}
                index={index}
                onActive={setActiveIndex}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>

        <div className={styles.closing}>
          <p>Not sure which capability you need? Start with the problem.</p>
          <Link href="/contact">Discuss it with us <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
};
