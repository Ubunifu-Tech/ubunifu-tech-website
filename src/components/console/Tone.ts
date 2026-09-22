import tones from '@/styles/tones.module.css';

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'teal' | 'violet' | 'orange' | 'neutral';

/** The class that sets --tone-bg / --tone-fg / --tone-dot for a tone. */
export function toneClass(tone: Tone): string {
  return tones[tone] ?? '';
}

const PALETTE: Tone[] = ['blue', 'teal', 'violet', 'orange', 'green', 'amber'];

/**
 * A stable colour for a name: the same client or person always gets the same
 * one, on every screen, without anybody storing it.
 */
export function toneFor(key: string): Tone {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}
