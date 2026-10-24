import { services, type ServiceKey } from '@/content/services';
import { SystemDiagram, type SystemDiagramKind } from './SystemDiagram';
import styles from './CapabilityJourney.module.css';

type ServiceVisual = { kind: SystemDiagramKind; description: string };

const media: Partial<Record<ServiceKey, ServiceVisual>> = {
  web: {
    kind: 'web',
    description: 'Layers of a website stacked on one foundation.',
  },
  hosting: {
    kind: 'hosting',
    description: 'A domain connects website hosting and business email.',
  },
  branding: {
    kind: 'branding',
    description: 'Brand elements combined into one consistent set of materials.',
  },
  data: {
    kind: 'data',
    description: 'Separate records feed one reporting chart.',
  },
  ai: {
    kind: 'ai',
    description: 'Documents pass through an AI assistant, and a person reviews the result.',
  },
  strategy: {
    kind: 'strategy',
    description: 'Several possible routes on a planning sheet, with one chosen route reaching its destination.',
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
