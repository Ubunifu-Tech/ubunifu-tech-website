import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { Team } from '@/components/Team';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Topography } from '@/components/Topography';
import { visionMission, story, objectives, approach } from '@/content/about';
import styles from './About.module.css';

export const metadata = {
  title: 'About',
  description:
    'Ubunifu Technologies is a digital-solutions agency in Arusha, Tanzania, helping organisations across the country with web, data, AI, branding, and strategy.',
};

export default function AboutPage() {
  const { vision, mission } = visionMission;
  const VisionIcon = vision.icon;
  const MissionIcon = mission.icon;

  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="About us"
          title="We make technology work for Tanzanian organisations."
          lead="A digital-solutions agency in Arusha: serious engineering, a real read of the local market, and a partnership that doesn't end at launch."
        />

        {/* Vision & Mission */}
        <section className={`section ${styles.vmSection}`}>
          <Topography className={styles.vmTopo} />
          <div className="container">
            <div className={styles.vmGrid}>
              <ScrollReveal className={styles.vmCard}>
                <div className={styles.vmIcon}>
                  <VisionIcon size={22} />
                </div>
                <span className={styles.vmLabel}>{vision.label}</span>
                <p className={styles.vmStatement}>{vision.body}</p>
              </ScrollReveal>
              <ScrollReveal className={styles.vmCard} delay={100}>
                <div className={styles.vmIcon}>
                  <MissionIcon size={22} />
                </div>
                <span className={styles.vmLabel}>{mission.label}</span>
                <p className={styles.vmStatement}>{mission.body}</p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Why we exist — story + image */}
        <section className={`section ${styles.storySection}`}>
          <div className="container">
            <div className={styles.storyGrid}>
              <ScrollReveal className={styles.storyText}>
                <span className="eyebrow">Why we exist</span>
                <h2 className={styles.storyHeading}>
                  Most software was built for somewhere else.
                </h2>
                {story.map((paragraph) => (
                  <p key={paragraph} className={styles.storyP}>
                    {paragraph}
                  </p>
                ))}
              </ScrollReveal>

              <ScrollReveal className={styles.storyMedia} delay={120}>
                <div className={styles.storyImageWrap}>
                  <Image
                    src="/about/collaboration.jpg"
                    alt="A working session reviewing plans and screens together"
                    fill
                    sizes="(max-width: 900px) 100vw, 520px"
                    className={styles.storyImg}
                  />
                  <div className={styles.storyTint} aria-hidden="true" />
                </div>
                <div className={styles.storyCard}>
                  <p className={styles.storyQuote}>One team, no handoffs.</p>
                  <p className={styles.storyCardSub}>
                    You work directly with the people who build and run it.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Objectives */}
        <section className={`section ${styles.objSection}`}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">What we&apos;re working toward</span>
              <h2 className={styles.sectionHeading}>Four things we hold ourselves to</h2>
            </ScrollReveal>
            <div className={styles.objGrid}>
              {objectives.map((objective, index) => {
                const Icon = objective.icon;
                return (
                  <ScrollReveal
                    key={objective.title}
                    className={styles.objCard}
                    delay={index * 80}
                  >
                    <div className={styles.objIcon}>
                      <Icon size={22} />
                    </div>
                    <h3 className={styles.objTitle}>{objective.title}</h3>
                    <p className={styles.objBody}>{objective.body}</p>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* What we believe (values) */}
        <About hideHeader={false} />

        {/* How we work */}
        <section className={`section ${styles.approachSection}`}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">How we work</span>
              <h2 className={styles.sectionHeading}>From first call to long-term partner</h2>
            </ScrollReveal>
            <div className={styles.approachGrid}>
              <div className={styles.approachLine} aria-hidden="true" />
              {approach.map((step, index) => (
                <ScrollReveal
                  key={step.title}
                  className={styles.approachStep}
                  delay={index * 80}
                >
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
      <Footer />
    </>
  );
}
