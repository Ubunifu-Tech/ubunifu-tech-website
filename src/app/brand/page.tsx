import type { Metadata } from 'next';
import styles from './Brand.module.css';

export const metadata: Metadata = {
  title: 'Brand Kit — Ubunifu Technologies',
  description: 'Internal brand reference: colours, type, and logo.',
  robots: { index: false, follow: false },
};

type Swatch = { name: string; hex: string; rgb: string; token: string; usage: string };

const GROUPS: { title: string; colors: Swatch[] }[] = [
  {
    title: 'Brand — Warm Orange',
    colors: [
      { name: 'Brand Orange', hex: '#FF6B2C', rgb: '255, 107, 44', token: '--brand', usage: 'Primary identity: logo, CTAs, accents, eyebrows' },
      { name: 'Orange Hover', hex: '#E8581E', rgb: '232, 88, 30', token: '--brand-hover', usage: 'Hover / pressed state on orange' },
      { name: 'Orange Deep', hex: '#C44615', rgb: '196, 70, 21', token: '--brand-deep', usage: 'Deepest orange — strong shadows, pressed' },
    ],
  },
  {
    title: 'Accent — Purple & Blue',
    colors: [
      { name: 'Purple', hex: '#6D3FE8', rgb: '109, 63, 232', token: '--primary', usage: 'Secondary accent: logo gradient end, hovers, badges' },
      { name: 'Purple Deep', hex: '#3D1FA0', rgb: '61, 31, 160', token: '--primary-deep', usage: 'Deep purple, pressed states' },
      { name: 'Blue', hex: '#2E5BFF', rgb: '46, 91, 255', token: '--accent', usage: 'Decorative only — soft background glows' },
    ],
  },
  {
    title: 'Foundation',
    colors: [
      { name: 'Lavender (Background)', hex: '#F4F2FB', rgb: '244, 242, 251', token: '--background', usage: 'Page background' },
      { name: 'White (Surface)', hex: '#FFFFFF', rgb: '255, 255, 255', token: '--surface', usage: 'Cards, forms, navbar' },
      { name: 'Surface 2', hex: '#FAF8FE', rgb: '250, 248, 254', token: '--surface-2', usage: 'Alternate section background' },
    ],
  },
  {
    title: 'Text',
    colors: [
      { name: 'Navy (Text)', hex: '#1F1A36', rgb: '31, 26, 54', token: '--text-primary', usage: 'Headings & body copy' },
      { name: 'Secondary', hex: '#5A5170', rgb: '90, 81, 112', token: '--text-secondary', usage: 'Subheads, paragraph copy' },
      { name: 'Tertiary', hex: '#6B6385', rgb: '107, 99, 133', token: '--text-tertiary', usage: 'Labels, captions, helper text' },
    ],
  },
  {
    title: 'Warm-earth accent',
    colors: [
      { name: 'Clay', hex: '#C2693B', rgb: '194, 105, 59', token: '--clay', usage: 'Restrained editorial warm note' },
    ],
  },
];

const Lockup = ({ light = false }: { light?: boolean }) => (
  <span className={styles.lockup}>
    <span className={styles.mark}>U</span>
    <span className={styles.wordmark}>
      <span className={light ? styles.wmNameLight : styles.wmName}>Ubunifu</span>
      <span className={styles.wmAccent}>TECHNOLOGIES</span>
    </span>
  </span>
);

export default function BrandKit() {
  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <Lockup />
          <h1 className={styles.title}>Brand Kit</h1>
          <p className={styles.tagline}>Digital solutions, built for Tanzania.</p>
          <p className={styles.intro}>
            The single reference for keeping everything we make on brand — decks, social, print,
            video. Colours (hex + RGB), type, and logo.
          </p>
          <a className={styles.download} href="/ubunifu-brand-guide.pdf" download>
            Download PDF ↓
          </a>
        </header>

        <section className={styles.section}>
          <h2 className={styles.h2}>Logo</h2>
          <div className={styles.logoRow}>
            <div className={styles.logoCard}>
              <span className={styles.markLg}>U</span>
              <p className={styles.logoLabel}>The mark — favicon, avatar, app icon</p>
            </div>
            <div className={styles.logoCard}>
              <Lockup />
              <p className={styles.logoLabel}>Primary lockup — everyday use</p>
            </div>
            <div className={`${styles.logoCard} ${styles.dark}`}>
              <Lockup light />
              <p className={styles.logoLabelLight}>On dark backgrounds</p>
            </div>
          </div>
          <p className={styles.note}>
            The mark is a gradient block: <code>linear-gradient(135deg, #FF6B2C, #6D3FE8)</code>.
            Never recolour, stretch, or add effects to it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Signature gradient</h2>
          <div className={styles.gradientBlock} />
          <p className={styles.note}>
            <code>linear-gradient(135deg, #FF6B2C → #6D3FE8)</code> — 135°, orange to purple. Used
            on the logo mark and the hero headline highlight.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Colours</h2>
          {GROUPS.map((g) => (
            <div key={g.title} className={styles.group}>
              <p className={styles.groupTitle}>{g.title}</p>
              <div className={styles.swatchGrid}>
                {g.colors.map((c) => (
                  <div key={c.token} className={styles.swatch}>
                    <div
                      className={styles.chip}
                      style={{
                        background: c.hex,
                        borderBottom: c.hex === '#FFFFFF' ? '1px solid var(--border)' : 'none',
                      }}
                    />
                    <div className={styles.swatchMeta}>
                      <p className={styles.swatchName}>{c.name}</p>
                      <p className={styles.swatchVal}>{c.hex}</p>
                      <p className={styles.swatchVal}>rgb({c.rgb})</p>
                      <p className={styles.swatchToken}>{c.token}</p>
                      <p className={styles.swatchUsage}>{c.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Typography</h2>
          <div className={styles.typeGrid}>
            <div className={styles.typeCard}>
              <p className={styles.typeAa} style={{ fontFamily: 'var(--font-heading)' }}>Aa</p>
              <p className={styles.typeName}>Poppins</p>
              <p className={styles.typeUse}>Headings &amp; logo — weights 600 / 700 / 800</p>
            </div>
            <div className={styles.typeCard}>
              <p className={styles.typeAa} style={{ fontFamily: 'var(--font-body)' }}>Aa</p>
              <p className={styles.typeName}>Inter</p>
              <p className={styles.typeUse}>Body &amp; UI — weights 400 – 700</p>
            </div>
            <div className={styles.typeCard}>
              <p className={styles.typeAa} style={{ fontFamily: 'var(--font-mono)', fontSize: '2.6rem' }}>Aa</p>
              <p className={styles.typeName}>Monospace</p>
              <p className={styles.typeUse}>Labels &amp; kickers — UPPERCASE, wide tracking</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Voice &amp; rules</h2>
          <div className={styles.rulesGrid}>
            <div>
              <p className={styles.ruleHead}>Voice</p>
              <p className={styles.ruleText}>
                Confident, warm, specific — like a person who knows the subject. Not corporate.
                Avoid value-words (innovative, world-class, seamless).
              </p>
            </div>
            <div>
              <p className={styles.ruleHead}>Do</p>
              <ul className={styles.ruleList}>
                <li>Orange for CTAs, accents, and the logo.</li>
                <li>Navy (#1F1A36) for headings &amp; body.</li>
                <li>Purple sparingly — a second accent.</li>
                <li>Generous white space; clean cards.</li>
              </ul>
            </div>
            <div>
              <p className={styles.ruleHead}>Don&apos;t</p>
              <ul className={styles.ruleList}>
                <li>Recolour or stretch the logo.</li>
                <li>Bake the tagline into the logo lockup.</li>
                <li>Use bright orange for small body text on light.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
