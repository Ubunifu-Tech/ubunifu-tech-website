import { services, type ServiceKey } from '@/content/services';
import { SystemDiagram, type SystemDiagramKind } from './SystemDiagram';
import styles from './CapabilityJourney.module.css';

type ServiceVisual = { kind: SystemDiagramKind; description: string };

const media: Partial<Record<ServiceKey, ServiceVisual>> = {
  web: {
    kind: 'web',
    description: 'A desktop website adapts to a mobile screen.',
  },
  hosting: {
    kind: 'hosting',
    description: 'A domain connects website hosting and business email.',
  },
  branding: {
    kind: 'branding',
    description: 'Identity elements resolve into one consistent set of brand surfaces.',
  },
  data: {
    kind: 'data',
    description: 'Source records feed a business reporting chart.',
  },
  ai: {
    kind: 'ai',
    description: 'Source documents pass through an AI assistant, with a person reviewing its output.',
  },
  strategy: {
    kind: 'strategy',
    description: 'Several candidate routes across a planning sheet, with one chosen route arriving at a destination.',
  },
};

export function CapabilityJourney() {
  return (
    <section className={styles.section} aria-label="Our services">
      <div className="container">
        {services.map((service) => {
          const visual = media[service.key];
          return (
            <article key={service.key} id={service.key} className={`${styles.chapter} ${!visual ? styles.textOnly : ''}`}>
              {visual && (
                <div className={styles.media}>
                  <SystemDiagram kind={visual.kind} description={visual.description} />
                </div>
              )}
              <div className={styles.copy}>
                <h2>{service.title}</h2>
                <p className={styles.description}>{service.description}</p>
                <ul className={styles.outcomes} aria-label={`${service.title} includes`}>
                  {service.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
