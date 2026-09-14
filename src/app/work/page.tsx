import { ArrowUpRight } from 'lucide-react';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { WorkRegister } from '@/components/WorkRegister';
import { Testimonial } from '@/components/Testimonial';
import { projects } from '@/content/portfolio';
import { pageMetadata } from '@/lib/metadata';
import styles from './Work.module.css';

export const metadata = pageMetadata({
  title: 'Our Work',
  description:
    'Production websites and operations platforms Ubunifu has shipped for clients in Tanzania.',
  path: '/work',
});

export default function WorkPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <PageHeader
          scene="work"
          eyebrow="Our work"
          title="Our work is live. Go and look."
          lead="Two systems we built, both running today. Every link on this page opens the real thing."
        />

        {/* Dispatch strip: the two addresses, above the fold, each a whole link.
            The fastest possible route from this page to something checkable. */}
        <section className={styles.dispatch} aria-label="Live client sites">
          <div className="container">
            <ul className={styles.dispatchList}>
              {projects.map((project) => (
                <li key={project.slug}>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.dispatchRow}
                  >
                    <span className={styles.dispatchDomain}>
                      <span className="srOnly">Visit </span>
                      {project.domain}
                    </span>
                    <span className={styles.dispatchCategory}>{project.category}</span>
                    <ArrowUpRight size={20} aria-hidden="true" className={styles.dispatchArrow} />
                    <span className="srOnly"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.register} aria-label="Project register">
          <div className="container">
            <WorkRegister />
          </div>
        </section>

        <Testimonial />

        {/* Self-select first, candour last. Never the other way round: leading with
            what we have not measured discounts the testimonial directly above it. */}
        <section className={styles.coda}>
          <div className="container">
            <p className={styles.codaText}>
              We have not measured booking volumes or staff hours on either system, so we
              do not quote them. What we publish is what each system does, and the address
              where you can go and check it.
            </p>
          </div>
        </section>
      </main>
      <CtaBand />
    </>
  );
}
