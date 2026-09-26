import styles from './BrandKit.module.css';

export type BrandKitData = {
  colors: { name: string; hex: string; usage: string | null }[];
  typography: string | null;
  principles: string | null;
  imageryDirection: string | null;
  notes: string | null;
};

/**
 * A brand kit as a reader sees it: the colours as swatches, then how type,
 * layout and photos should feel. Shared by the console and the client portal,
 * so both are looking at the same thing. The hex codes are checked when the
 * kit is saved, which is what makes them safe to paint with.
 */
export function BrandKitView({
  kit,
  showNotes = false,
}: {
  kit: BrandKitData;
  showNotes?: boolean;
}) {
  const words = [
    { label: 'Type', value: kit.typography },
    { label: 'Layout', value: kit.principles },
    { label: 'Photos', value: kit.imageryDirection },
    ...(showNotes ? [{ label: 'Notes for the team', value: kit.notes }] : []),
  ].filter((item) => item.value);

  return (
    <div className={styles.kit}>
      {kit.colors.length > 0 && (
        <ul className={styles.swatches} aria-label="Colours">
          {kit.colors.map((color) => (
            <li key={`${color.name}-${color.hex}`} className={styles.swatch}>
              <span className={styles.chip} style={{ background: color.hex }} aria-hidden="true" />
              <span className={styles.swatchText}>
                <span className={styles.colorName}>{color.name}</span>
                <span className={styles.hex}>{color.hex}</span>
                {color.usage && <span className={styles.usage}>{color.usage}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {words.length > 0 && (
        <dl className={styles.words}>
          {words.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
