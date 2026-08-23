import { BrandLockup, BrandMark } from '@/components/BrandMark';
import { pageMetadata } from '@/lib/metadata';
import styles from './Brand.module.css';

export const metadata = pageMetadata({
  title: 'Brand kit',
  description: 'Ubunifu Technologies logo assets, colours, typography, visual language, and usage rules.',
  path: '/brand',
});

type Swatch = { name: string; hex: string; rgb: string; token: string; usage: string };

const GROUPS: { title: string; colors: Swatch[] }[] = [
  {
    title: 'Brand — Warm Orange',
    colors: [
      { name: 'Brand Orange', hex: '#FF6B2C', rgb: '255, 107, 44', token: '--brand', usage: 'Logo, paths, large accents and atmospheres' },
      { name: 'Orange Hover', hex: '#E8581E', rgb: '232, 88, 30', token: '--brand-hover', usage: 'Decorative orange interaction states' },
      { name: 'Orange Deep', hex: '#C44615', rgb: '196, 70, 21', token: '--brand-deep', usage: 'Accessible orange for buttons and small text' },
    ],
  },
  {
    title: 'Accent — Purple & Blue',
    colors: [
      { name: 'Purple', hex: '#6D3FE8', rgb: '109, 63, 232', token: '--primary', usage: 'Ligature T, links, hovers and badges' },
      { name: 'Purple Hover', hex: '#5A2DD0', rgb: '90, 45, 208', token: '--primary-hover', usage: 'Purple interaction states' },
      { name: 'Purple Deep', hex: '#3D1FA0', rgb: '61, 31, 160', token: '--primary-deep', usage: 'Deep purple, pressed states' },
      { name: 'Blue', hex: '#2E5BFF', rgb: '46, 91, 255', token: '--accent', usage: 'Decorative only — soft background glows' },
      { name: 'Blue Hover', hex: '#1F47E0', rgb: '31, 71, 224', token: '--accent-hover', usage: 'Blue interaction states when blue is used' },
    ],
  },
  {
    title: 'Foundation',
    colors: [
      { name: 'Lavender (Background)', hex: '#F4F2FB', rgb: '244, 242, 251', token: '--background', usage: 'Page background' },
      { name: 'White (Surface)', hex: '#FFFFFF', rgb: '255, 255, 255', token: '--surface', usage: 'Cards, forms, navbar' },
      { name: 'Surface 2', hex: '#FAF8FE', rgb: '250, 248, 254', token: '--surface-2', usage: 'Alternate section background' },
      { name: 'Surface 3', hex: '#F0EDF9', rgb: '240, 237, 249', token: '--surface-3', usage: 'Subtle panels and dividers' },
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

export default function BrandKit() {
  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <BrandLockup />
          <h1 className={styles.title}>Brand Kit</h1>
          <p className={styles.tagline}>Consulting + products, built in Tanzania.</p>
          <p className={styles.intro}>
            The practical reference for the Ubunifu Technologies identity: the Ligature mark,
            lockups, palette, type, visual language, and writing voice.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.h2}>Logo</h2>
          <div className={styles.logoRow}>
            <div className={styles.logoCard}>
              <BrandMark className={styles.markLg} title="Ubunifu Technologies Ligature mark" />
              <p className={styles.logoLabel}>The Ligature — favicon, avatar, product signature</p>
            </div>
            <div className={styles.logoCard}>
              <BrandLockup />
              <p className={styles.logoLabel}>Primary lockup — everyday use</p>
            </div>
            <div className={`${styles.logoCard} ${styles.dark}`}>
              <BrandLockup inverse />
              <p className={styles.logoLabelLight}>On dark backgrounds</p>
            </div>
          </div>
          <p className={styles.note}>
            The orange U and purple T interlock as one engineered glyph. The angled T crown
            introduces forward motion; the shared lower junction makes the initials inseparable.
            Keep the free-standing silhouette intact and always write the full company name in text-bearing lockups.
          </p>
          <div className={styles.assetLinks}>
            <a className={styles.download} href="/brand/ubunifu-mark.svg" download>Colour mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-lockup.svg" download>Primary lockup · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-mark-navy.svg" download>Navy mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-mark-white.svg" download>White mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-lockup-white.svg" download>White lockup · SVG</a>
            <a className={styles.download} href="/logo-v2.png" download>Social avatar · PNG</a>
            <a className={styles.download} href="/og.png" download>Social preview · PNG</a>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Signature path</h2>
          <div className={styles.gradientBlock} />
          <p className={styles.note}>
            <code>#FF6B2C → #6D3FE8</code> — orange begins the path, purple resolves it.
            The gradient belongs in large headlines and atmospheres; the master mark uses two crisp solids.
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
                <li>Bright orange for the mark and large decorative accents.</li>
                <li>Deep orange (#C44615) behind white CTA text.</li>
                <li>Navy (#1F1A36) for headings &amp; body.</li>
                <li>Purple sparingly — the Ligature T and a second accent.</li>
                <li>Generous white space; clean cards.</li>
              </ul>
            </div>
            <div>
              <p className={styles.ruleHead}>Don&apos;t</p>
              <ul className={styles.ruleList}>
                <li>Recolour, stretch, box in, or shadow the master mark.</li>
                <li>Bake the tagline into the logo lockup.</li>
                <li>Shorten the company name to “Ubunifu” in a text-bearing lockup.</li>
                <li>Use bright orange for small body text on light.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
