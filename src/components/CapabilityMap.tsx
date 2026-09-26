import { ArrowRight } from 'lucide-react';
import { services, type ServiceKey } from '@/content/services';
import { ScrollReveal } from './ScrollReveal';
import styles from './CapabilityMap.module.css';

/**
 * The map at the top of /build.
 *
 * The page below this is six long chapters, one per service, and it used to
 * open straight into the first of them — no overview, no way to reach the one
 * you came for without scrolling past the rest. This groups the same six by the
 * layer of a business they serve and links into each chapter's existing anchor,
 * so the page gains a table of contents that also says how the services relate.
 *
 * The groups are a presentation of src/content/services.tsx, never a second copy
 * of it: titles and summaries are read from there, and `keys` only says which
 * service belongs in which layer. Add a service there and it will not appear
 * here until it is placed in a group, which is deliberate — a service with no
 * layer is a content decision, not something to guess at render time.
 */

type Group = {
  title: string;
  /** What this layer is, in the reader's terms rather than ours. */
  note: string;
  /** Drives the rule colour beneath the group heading. */
  hue: 'brand' | 'primary' | 'accent' | 'neutral';
  keys: ReadonlyArray<ServiceKey>;
};

const GROUPS: ReadonlyArray<Group> = [
  {
    title: 'Build and experience',
    note: 'What people actually use',
    hue: 'brand',
    keys: ['web', 'branding'],
  },
  {
    title: 'Data and intelligence',
    note: 'What decisions run on',
    hue: 'primary',
    keys: ['data', 'ai'],
  },
  {
    title: 'Keep it running',
    note: 'What holds it together',
    hue: 'accent',
    keys: ['hosting'],
  },
  {
    title: 'Direction',
    note: 'Where it goes next',
    hue: 'neutral',
    keys: ['strategy'],
  },
];

export function CapabilityMap() {
  return (
    <section className={styles.section} aria-labelledby="capability-map-title">
      <div className="container">
        <ScrollReveal className={styles.intro}>
          <h2 id="capability-map-title" className={styles.heading}>
            Where does each capability <span className={styles.headingAccent}>fit?</span>
          </h2>
          <p className={styles.lead}>
            Each one serves a different layer of how an organisation runs. Start where you
            need help; most projects end up combining more than one.
          </p>
        </ScrollReveal>

        <div className={styles.banner}>
          <p className={styles.bannerLabel}>What it all supports</p>
          <p className={styles.bannerText}>
            The websites, records, and day-to-day operations your organisation depends on.
          </p>
        </div>

        <div className={styles.groups}>
          {GROUPS.map((group) => (
            <section key={group.title} className={styles.group} data-hue={group.hue}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <p className={styles.groupNote}>{group.note}</p>

              <ul className={styles.cards}>
                {group.keys.map((key) => {
                  const service = services.find((item) => item.key === key);
                  if (!service) return null;
                  return (
                    <li key={key}>
                      {/* Into the chapter's own anchor further down this page. */}
                      <a href={`#${key}`} className={styles.card}>
                        <span className={styles.cardHead}>
                          <span className={styles.cardTitle}>{service.title}</span>
                          <span className={styles.cardArrow} aria-hidden="true">
                            <ArrowRight size={14} strokeWidth={2.2} />
                          </span>
                        </span>
                        <span className={styles.cardSummary}>{service.summary}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
