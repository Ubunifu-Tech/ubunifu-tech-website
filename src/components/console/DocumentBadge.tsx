import type { DocumentTone } from '@/lib/console/documents';
import forms from '@/styles/forms.module.css';

const TONE: Record<Exclude<DocumentTone, 'quiet'>, string> = {
  good: forms.badgeGood,
  bad: forms.badgeBad,
  warn: forms.badgeWarn,
  live: forms.badgeLive,
};

/**
 * A document's state in the console, one look everywhere it is listed.
 * Takes what consoleDocumentState returns.
 */
export function DocumentBadge({ label, tone }: { label: string; tone: DocumentTone }) {
  return (
    <span className={tone === 'quiet' ? forms.badge : `${forms.badge} ${TONE[tone]}`}>{label}</span>
  );
}
