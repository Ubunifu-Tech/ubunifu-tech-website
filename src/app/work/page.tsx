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
          ambient={false}
          scene="work"
          compact
          eyebrow="Our work"
          title="Our work is live. Go and look."
          lead="Safari King Africa runs its bookings, customer records and publishing on a platform we built. Usambara Destination runs its trip enquiries on one we built. Both links open the running sites."
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
              We build at two depths. Usambara Destination is a site that carries someone
              from browsing to a well-formed enquiry and hands it to the operator’s own
              inbox. Safari King Africa is that plus the system behind it — customer
              records, roles, an audit trail, assisted drafting with human review. Both
              are live above. We have not measured booking volumes or staff hours on
              either, so we do not quote them; what we publish instead is what each system
              does and the address where you can check it.
            </p>
          </div>
        </section>
      </main>
      <CtaBand />
    </>
  );
}
