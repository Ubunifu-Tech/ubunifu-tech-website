import Image from 'next/image';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { Team } from '@/components/Team';
import { ScrollReveal } from '@/components/ScrollReveal';
import { story, approach } from '@/content/about';
import { pageMetadata } from '@/lib/metadata';
import styles from './About.module.css';

export const metadata = pageMetadata({
  title: 'About',
  description:
    'Ubunifu Technologies is an Arusha-based technology consultancy. We build digital systems for clients and operate software products of our own.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <main>
        <PageHeader
          variant="human"
          register={['Small team', 'Senior involvement', 'Arusha']}
          eyebrow="About Ubunifu"
          title="Built in Arusha. Close to the work."
          lead="We are a small, senior team combining consulting and product building. The same people who help frame the problem stay present through design, engineering, launch, and any support we agree together."
          artwork={{
            primary: {
              src: '/editorial/software-tanzania-learning.webp',
              alt: 'Tactile workbench where research, modular decisions, and revision loops become a working assembly',
            },
            caption: 'Conceptual illustration · Built in Arusha through learning by building',
          }}
        />

        <section className={`section ${styles.storySection}`}>
          <div className="container">
            <div className={styles.storyGrid}>
              <ScrollReveal>
                <span className="eyebrow">Why we exist</span>
                <h2 className={styles.storyHeading}>
                  A consultancy that learns by building products.
                </h2>
                {story.map((paragraph) => (
                  <p key={paragraph} className={styles.storyP}>{paragraph}</p>
                ))}
              </ScrollReveal>

              <ScrollReveal className={styles.storyMedia} delay={120}>
                <figure className={styles.storyImageWrap}>
                  <Image
                    src="/editorial/build-or-buy.webp"
                    alt="Tactile editorial composition showing two equally valid paths from one problem: modular tools and a custom-built system"
                    fill
                    sizes="(max-width: 900px) 100vw, 560px"
                    className={styles.storyImg}
                  />
                  <figcaption className={styles.storyCaption}>
                    Conceptual illustration · Two practical routes from one operating problem
                  </figcaption>
                </figure>
                <div className={styles.storyCard}>
                  <p className={styles.storyQuote}>Tailored systems. Operated products.</p>
                  <p className={styles.storyCardSub}>
                    Commission a system, or use one we already operate.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <About
          eyebrow="Operating principles"
          heading="How we make the work useful"
          intro="The standards we use to make decisions when the brief is incomplete and the trade-offs are real."
        />

        <section className={`section ${styles.approachSection}`}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">How we work</span>
              <h2 className={styles.sectionHeading}>Close collaboration, clear decisions</h2>
            </ScrollReveal>
            <div className={styles.approachGrid}>
              {approach.map((step, index) => (
                <ScrollReveal key={step.title} className={styles.approachStep} delay={index * 80}>
                  <span className={styles.approachNum}>{index + 1}</span>
                  <h3 className={styles.approachTitle}>{step.title}</h3>
                  <p className={styles.approachBody}>{step.body}</p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <Team />
      </main>
      <CtaBand />
    </>
  );
}
