import { BrandLockup, BrandMark } from '@/components/BrandMark';
import { PageHeader } from '@/components/PageHeader';
import { brandColors } from '@/lib/brand';
import { pageMetadata } from '@/lib/metadata';
import styles from './Brand.module.css';

// Internal reference, not part of the public site: no navigation links to it and
// no sitemap entry. noindex so it stays out of search results if the URL is
// shared or discovered. The page itself remains reachable by address.
export const metadata = {
  ...pageMetadata({
    title: 'Brand kit',
    description: 'Ubunifu Technologies logo assets, colours, typography, visual language, and usage rules.',
    path: '/brand',
  }),
  robots: { index: false, follow: false },
};

type Swatch = { name: string; hex: string; rgb: string; token: string; usage: string };

const GROUPS: { title: string; colors: Swatch[] }[] = [
  {
    title: 'Core identity',
    colors: [
      { name: 'Ink Navy', hex: brandColors.ink, rgb: '31, 26, 54', token: '--text-primary', usage: 'Wordmark, headings and dark fields' },
      { name: 'Signal Orange', hex: brandColors.orange, rgb: '255, 107, 44', token: '--brand', usage: 'Ligature U, paths and large accents' },
      { name: 'Digital Violet', hex: brandColors.violet, rgb: '109, 63, 232', token: '--primary', usage: 'Ligature T, links and digital intelligence' },
    ],
  },
  {
    title: 'Interaction and supporting tones',
    colors: [
      { name: 'Wordmark Orange', hex: brandColors.orangeWordmark, rgb: '194, 71, 21', token: '--brand-wordmark', usage: 'Ubunifu wordmark on light surfaces' },
      { name: 'Accessible Orange', hex: brandColors.orangeDeep, rgb: '166, 58, 17', token: '--brand-deep', usage: 'Buttons and small orange text' },
      { name: 'Orange Hover', hex: '#E8581E', rgb: '232, 88, 30', token: '--brand-hover', usage: 'Decorative orange interaction states' },
      { name: 'Purple Hover', hex: '#5A2DD0', rgb: '90, 45, 208', token: '--primary-hover', usage: 'Purple interaction states' },
      { name: 'Purple Deep', hex: '#3D1FA0', rgb: '61, 31, 160', token: '--primary-deep', usage: 'Deep purple, pressed states' },
      { name: 'Data Blue', hex: '#2E5BFF', rgb: '46, 91, 255', token: '--accent', usage: 'Data and infrastructure illustration only' },
    ],
  },
  {
    title: 'Foundation',
    colors: [
      { name: 'White (Background)', hex: '#FFFFFF', rgb: '255, 255, 255', token: '--background', usage: 'Page background' },
      { name: 'White (Surface)', hex: '#FFFFFF', rgb: '255, 255, 255', token: '--surface', usage: 'Cards, forms, navbar' },
      { name: 'Surface 2', hex: '#F8F8F9', rgb: '248, 248, 249', token: '--surface-2', usage: '3% navy on white; alternate sections' },
      { name: 'Surface 3', hex: '#F2F1F3', rgb: '242, 241, 243', token: '--surface-3', usage: '6% navy on white; subtle grouping' },
    ],
  },
  {
    title: 'Text',
    colors: [
      { name: 'Navy (Text)', hex: '#1F1A36', rgb: '31, 26, 54', token: '--text-primary', usage: 'Headings & body copy' },
      { name: 'Secondary', hex: '#575368', rgb: '87, 83, 104', token: '--text-secondary', usage: '75% navy on white; paragraph copy' },
      { name: 'Tertiary', hex: '#6D6A7C', rgb: '109, 106, 124', token: '--text-tertiary', usage: '65% navy on white; supporting text' },
    ],
  },
];

export default function BrandKit() {
  return (
    <main className={styles.page}>
      <PageHeader
        scene="brand"
        eyebrow="Brand kit"
        title="Logo files and brand guidelines."
        lead="The Ubunifu Technologies logo, colours, typography and guidance for using them."
      />
      <div className="container">
        <section className={styles.section}>
          <h2 className={styles.h2}>Logo</h2>
          <div className={styles.logoRow}>
            <div className={styles.logoCard}>
              <BrandMark className={styles.markLg} title="Ubunifu Technologies Ligature mark" />
              <p className={styles.logoLabel}>The Ligature: favicon, avatar, product signature</p>
            </div>
            <div className={styles.logoCard}>
              <BrandLockup />
              <p className={styles.logoLabel}>Primary lockup: everyday use</p>
            </div>
            <div className={`${styles.logoCard} ${styles.dark}`}>
              <BrandLockup inverse />
              <p className={styles.logoLabelLight}>On dark backgrounds</p>
            </div>
          </div>
          <p className={styles.note}>
            The original orange U and violet T interlock as one engineered glyph. Its angled
            crown introduces forward motion. Ubunifu uses accessible orange and Technologies
            uses violet, keeping both brand colours present in the full company name.
          </p>
          <div className={styles.assetLinks}>
            <a className={styles.download} href="/brand/ubunifu-mark.svg" download>Primary mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-lockup.svg" download>Primary lockup · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-wordmark.svg" download>Wordmark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-lockup-stacked.svg" download>Stacked lockup · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-mark-inverse.svg" download>Reversed mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-lockup-white.svg" download>Reversed lockup · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-wordmark-white.svg" download>Reversed wordmark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-mark-navy.svg" download>Navy mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-mark-white.svg" download>White mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-watermark.svg" download>Watermark mark · SVG</a>
            <a className={styles.download} href="/brand/ubunifu-watermark-lockup.svg" download>Watermark lockup · SVG</a>
            <a className={styles.download} href="/brand/png/ubunifu-mark-1024.png" download>Primary mark · PNG</a>
            <a className={styles.download} href="/brand/png/ubunifu-lockup-1600.png" download>Primary lockup · PNG</a>
            <a className={styles.download} href="/brand/png/ubunifu-wordmark-1600.png" download>Wordmark · PNG</a>
            <a className={styles.download} href="/brand/png/ubunifu-lockup-stacked-1200.png" download>Stacked lockup · PNG</a>
            <a className={styles.download} href="/brand/png/ubunifu-watermark-1200.png" download>Watermark mark · PNG</a>
            <a className={styles.download} href="/brand/png/ubunifu-watermark-lockup-1600.png" download>Watermark lockup · PNG</a>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Signature path</h2>
          <div className={styles.gradientBlock} />
          <p className={styles.note}>
            <code>#FF6B2C → #6D3FE8</code>, orange begins the path, purple resolves it.
            The gradient belongs only in large paths and atmospheres. The master mark keeps the
            orange U and violet T as two crisp solids, supported by dark navy.
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
              <p className={styles.typeUse}>Headings: medium 500. The original logo keeps its 600 / 700 weights.</p>
            </div>
            <div className={styles.typeCard}>
              <p className={styles.typeAa} style={{ fontFamily: 'var(--font-body)' }}>Aa</p>
              <p className={styles.typeName}>Inter</p>
              <p className={styles.typeUse}>Body, labels, and controls: regular 400, with normal letter spacing.</p>
            </div>
            <div className={styles.typeCard}>
              <p className={styles.typeAa} style={{ fontFamily: 'var(--font-mono)' }}>Aa</p>
              <p className={styles.typeName}>Monospace</p>
              <p className={styles.typeUse}>Code only: regular weight, at the same body size.</p>
            </div>
          </div>
          <p className={styles.note}>
            Three sizes throughout: display for page titles, heading for sections,
            and body for text, labels, and controls. Display and heading sizes adapt
            to the viewport; body text remains 1rem. Spacing creates the hierarchy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Voice &amp; rules</h2>
          <div className={styles.rulesGrid}>
            <div>
              <p className={styles.ruleHead}>Voice</p>
              <p className={styles.ruleText}>
                Confident, warm, specific, like a person who knows the subject. Not corporate.
                Avoid value-words (innovative, world-class, seamless).
              </p>
            </div>
            <div>
              <p className={styles.ruleHead}>Do</p>
              <ul className={styles.ruleList}>
                <li>The wordmark pairs accessible orange for Ubunifu with violet for Technologies.</li>
                <li>Bright orange belongs to the Ligature U and large accents.</li>
                <li>Deep orange (#A63A11) sits behind white CTA text.</li>
                <li>Navy (#1F1A36) for headings &amp; body.</li>
                <li>Violet belongs to the Ligature T, links, intelligence, and motion.</li>
                <li>Generous space, open rules, and few enclosed cards.</li>
              </ul>
            </div>
            <div>
              <p className={styles.ruleHead}>Don&apos;t</p>
              <ul className={styles.ruleList}>
                <li>Recolour, stretch, box in, or shadow the master mark.</li>
                <li>Bake the tagline into the logo lockup.</li>
                <li>Shorten the company name to “Ubunifu” in a text-bearing lockup.</li>
                <li>Use bright orange for small body text on light.</li>
                <li>Treat data blue as a fourth identity colour.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
