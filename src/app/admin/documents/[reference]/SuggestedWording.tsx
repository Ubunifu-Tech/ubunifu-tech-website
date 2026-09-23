import Link from 'next/link';
import { Callout } from '@/components/console/Callout';
import { SuggestionActions } from '../DocumentEditor';
import forms from '@/styles/forms.module.css';
import css from './SuggestedWording.module.css';

export type WordingSuggestion = {
  id: string;
  who: string;
  when: string;
  note: string | null;
  basedOnVersion: number;
  /** From renderParagraphDiff: every piece of text in it is escaped. */
  html: string;
  added: number;
  removed: number;
  feesChanged: boolean;
};

function paragraphs(count: number): string {
  return `${count} ${count === 1 ? 'paragraph' : 'paragraphs'}`;
}

/**
 * Wording a client sent back, compared with the version they were reading.
 *
 * Shown above the steps while any is waiting, because it is the thing to act
 * on before anything else on the page.
 */
export function SuggestedWording({
  reference,
  suggestions,
  latestVersion,
}: {
  reference: string;
  suggestions: WordingSuggestion[];
  latestVersion: number;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className={`${forms.card} ${css.card}`}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Their suggested wording</h2>
        <span className={`${forms.cardMeta} ${css.legend}`}>
          <del>Taken out</del>
          <ins>Put in</ins>
        </span>
      </div>

      <ol className={css.list}>
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className={css.item}>
            <p className={css.byline}>
              <span className={css.who}>{suggestion.who}</span> sent this on {suggestion.when},
              working from version {suggestion.basedOnVersion}. {paragraphs(suggestion.removed)}{' '}
              taken out, {paragraphs(suggestion.added)} put in.
            </p>

            {suggestion.note && <p className={`${forms.quote} ${css.note}`}>{suggestion.note}</p>}

            {suggestion.feesChanged && (
              <Callout
                kind="info"
                title="They changed the fees"
                action={<Link href={`/documents/${reference}?step=fees`}>Open the Fees step</Link>}
              >
                If you agree, change them in the Fees step. Their fee table is not carried into the
                next version.
              </Callout>
            )}

            <div
              className={`${forms.prose} ${css.diff}`}
              // Built by renderParagraphDiff, which renders each block through
              // the document renderer: the client's text is escaped before any
              // tag is added, and images are shown as their description.
              dangerouslySetInnerHTML={{ __html: suggestion.html }}
            />

            <SuggestionActions
              suggestionId={suggestion.id}
              basedOnVersion={suggestion.basedOnVersion}
              latestVersion={latestVersion}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
