import { toneClass, toneFor } from './Tone';
import styles from './Avatar.module.css';

/** Two letters from a name: "Nifuate Tanzania Adventures" → "NT". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]![0] ?? '';
  const second = words.length > 1 ? words[1]![0] ?? '' : words[0]![1] ?? '';
  return (first + second).toUpperCase();
}

/**
 * A person or organisation, as a coloured circle with their initials. The
 * colour comes from the name, so it is the same everywhere they appear.
 */
export function Avatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${toneClass(toneFor(name))}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
