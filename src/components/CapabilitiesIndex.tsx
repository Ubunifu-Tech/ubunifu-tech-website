'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { services, type ServiceKey } from '@/content/services';
import { AmbientShader, type ShaderCharacter } from './AmbientShader';
import styles from './CapabilitiesIndex.module.css';

/**
 * "What we do" — one purple field anchoring six services.
 *
 * The panel is the section's single visual, and it answers to the list: hovering
 * or focusing a service shifts the field's character and swaps the panel's copy
 * for that service's concrete deliverables. Those deliverables are not repeated
 * in the rows, so the panel adds information rather than echoing it.
 *
 * Purple is deliberately concentrated here. Everywhere else on the site the
 * accent is orange; this is the one place violet carries a section, which is why
 * it reads as a decision rather than as the generic purple-tech wash.
 *
 * The list stays a hairline row list. A card grid would give six equal-weight
 * boxes competing with the panel for the one strong anchor the section wants.
 */

/**
 * Violet only. Orange was tried in the field at a fifth and then an eighth of the
 * stops; at full saturation it dominated the panel at both weights — MeshGradient
 * spreads its stops evenly, and #FF6B2C simply will not recede next to deep
 * violet. Purple is concentrated in the visual, and the brand accent stays where
 * the brief put it: a small one, on the row arrows.
 */
const PURPLE = [
  '#171232',
  '#6D3FE8',
  '#2A1F5C',
  '#4527B5',
  '#14102A',
  '#5A2DD0',
  '#241A4D',
] as const;

/**
 * Each service moves the field differently — tighter and faster for the hands-on
 * work, looser and slower for the advisory end. The differences are small on
 * purpose: the field should look like it noticed, not like it changed channel.
 */
const CHARACTER: Record<ServiceKey, ShaderCharacter> = {
  web: { colors: PURPLE, distortion: 0.92, swirl: 0.22, speed: 0.14 },
  hosting: { colors: PURPLE, distortion: 0.62, swirl: 0.10, speed: 0.08 },
  branding: { colors: PURPLE, distortion: 1.0, swirl: 0.46, speed: 0.12 },
  data: { colors: PURPLE, distortion: 0.7, swirl: 0.3, speed: 0.1 },
  ai: { colors: PURPLE, distortion: 0.98, swirl: 0.38, speed: 0.16 },
  strategy: { colors: PURPLE, distortion: 0.55, swirl: 0.16, speed: 0.07 },
};

const RESTING: ShaderCharacter = { colors: PURPLE, distortion: 0.8, swirl: 0.26, speed: 0.09 };

export const CapabilitiesIndex: React.FC = () => {
  const [activeKey, setActiveKey] = useState<ServiceKey | null>(null);
  const active = activeKey ? services.find((s) => s.key === activeKey) : undefined;

  return (
    <section className={styles.section} aria-labelledby="capabilities-index-title">
      <div className={`container ${styles.layout}`}>
        <div className={styles.intro}>
          <h2 id="capabilities-index-title" className={styles.heading}>
            What we do
          </h2>
          <p className={styles.lead}>
            We design, build, and maintain the technology your business uses.
          </p>
        </div>

        {/* Stacks above the list on narrow screens, where there is no hover to
            drive it and it simply rests. */}
        <div className={styles.panel}>
          <AmbientShader
            placement="panelTall"
            character={active ? CHARACTER[active.key] : RESTING}
            interactive={false}
          />
          {/* aria-live so a keyboard user tabbing the list hears the panel change
              rather than silently missing it. */}
          <div className={styles.panelBody} aria-live="polite">
            <p className={styles.panelTitle}>{active ? active.title : 'Six capabilities, one team'}</p>
            {active ? (
              <ul className={styles.panelItems}>
                {active.items.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.panelHint}>
                Point at a service to see what it covers.
              </p>
            )}
          </div>
        </div>

        <ul className={styles.list}>
          {services.map((service) => (
            <li key={service.key}>
              <Link
                href={`/build#${service.key}`}
                className={`${styles.item} ${activeKey === service.key ? styles.itemActive : ''}`}
                onMouseEnter={() => setActiveKey(service.key)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(service.key)}
                onBlur={() => setActiveKey(null)}
              >
                <span className={styles.itemTitle}>{service.title}</span>
                <span className={styles.summary}>{service.summary}</span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
