import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { Team } from '@/components/Team';
import { ScrollReveal } from '@/components/ScrollReveal';
import { EditorialPhoto } from '@/components/EditorialPhoto';
import { story, visionMission, objectives, approach } from '@/content/about';
import { editorialPhotography } from '@/content/editorial-photography';
import { pageMetadata } from '@/lib/metadata';
import styles from './About.module.css';

export const metadata = pageMetadata({
  title: 'About',
  description:
    'Ubunifu Technologies is a Tanzanian technology consultancy. We build digital systems for clients and operate software products of our own.',
  path: '/about',
});

export default function AboutPage() {
  const vm = [visionMission.vision, visionMission.mission];

  return (
    <>
      {/* Trialling the page-wide violet haze here first. Fixed and
          non-interactive, so its position in the tree does not matter. */}
      <PageAtmosphere />
      <main data-atmosphere>
        {/* The page haze is this page's ambient field, so the header does not
            run a second one: two placements meant two live WebGL contexts and
            two effects layered over the same hero. */}
        <PageHeader
          scene="about"
          eyebrow="About Ubunifu"
          title="Technology, made in Tanzania."
          lead="We’re a small technology team. You work directly with the people designing and building your project."
        />

        <section className={`section ${styles.storySection}`}>
          <div className="container">
            <div className={styles.storyGrid}>
              <div>
                <ScrollReveal>
                  <h2 className={styles.storyHeading}>
                    Client projects and our own products
                  </h2>
                </ScrollReveal>
                <ScrollReveal className={styles.storyMedia} delay={80}>
                  <EditorialPhoto
                    asset={editorialPhotography.aboutSystemsWorkshop}
                    sizes="(max-width: 860px) 100vw, (max-width: 1280px) 46vw, 570px"
                  />
                </ScrollReveal>
              </div>
              <ScrollReveal delay={120}>
                {story.map((paragraph) => (
                  <p key={paragraph} className={styles.storyP}>{paragraph}</p>
                ))}
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className={`section ${styles.vmSection}`} aria-labelledby="about-vm-title">
          <div className="container">
            <ScrollReveal>
              <h2 id="about-vm-title" className={styles.sectionHeading}>
                Where we are <span className={styles.headingAccent}>going</span>
              </h2>
            </ScrollReveal>
            <div className={styles.vmGrid}>
              {vm.map(({ icon: Icon, label, body }, i) => (
                <ScrollReveal key={label} className={styles.vmCard} delay={i * 100}>
                  <span className={styles.vmIcon} aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <h3 className={styles.vmLabel}>{label}</h3>
                  <p className={styles.vmStatement}>{body}</p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`section ${styles.objSection}`} aria-labelledby="about-objectives-title">
          <div className="container">
            <ScrollReveal>
              <h2 id="about-objectives-title" className={styles.sectionHeading}>
                What we <span className={styles.headingAccent}>hold ourselves to</span>
              </h2>
              <p className={styles.sectionLead}>
                Four commitments that shape how we scope a project, build it, and hand it over.
              </p>
            </ScrollReveal>
            <div className={styles.objGrid}>
              {objectives.map(({ icon: Icon, title, body }, i) => (
                <ScrollReveal key={title} className={styles.objCard} delay={i * 80}>
                  <span className={styles.objIcon} aria-hidden="true">
                    <Icon size={24} />
                  </span>
                  <h3 className={styles.objTitle}>{title}</h3>
                  <p className={styles.objBody}>{body}</p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`section ${styles.approachSection}`} aria-labelledby="about-approach-title">
          <div className="container">
            <ScrollReveal>
              <h2 id="about-approach-title" className={styles.sectionHeading}>
                How a project <span className={styles.headingAccent}>runs</span>
              </h2>
              {/* These are the same four stages the services page sets out in
                  detail. Linking rather than restating keeps one of them the
                  summary and the other the reference. */}
              <p className={styles.sectionLead}>
                The same four stages on every project.{' '}
                <Link href="/build">
                  See what each stage delivers <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </p>
            </ScrollReveal>
            <ol className={styles.approachGrid}>
              {approach.map(({ title, body }) => (
                <li key={title} className={styles.approachStep}>
                  <h3 className={styles.approachTitle}>{title}</h3>
                  <p className={styles.approachBody}>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <About
          heading="How we work"
          intro="We agree the scope, explain the decisions, and keep you involved as the project develops."
        />

        <Team />
      </main>
      <CtaBand />
    </>
  );
}
