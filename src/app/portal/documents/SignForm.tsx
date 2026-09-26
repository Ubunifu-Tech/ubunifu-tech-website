'use client';

import { useActionState, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  askForFreshSigningCopy,
  respondToDocument,
  signDocument,
  suggestWording,
  type SignState,
} from './actions';
import { TextAreaField } from '@/components/console/Fields';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: SignState = { status: 'idle' };

// The editor is fetched only when someone chooses to suggest wording. Most
// people who open a document sign it, and should not download an editor to do so.
const RichText = dynamic(
  () => import('@/components/console/RichText').then((loaded) => loaded.RichText),
  {
    ssr: false,
    loading: () => <p className={forms.hint}>Opening the document for editing…</p>,
  },
);

/**
 * Signing.
 *
 * Nothing is pre-ticked and nothing is pre-filled. The two confirmations are
 * separate because they are two different agreements — this document, and the
 * standard terms — and collapsing them into one tick is how people end up
 * having agreed to something they never read.
 */
export function SignForm({
  requestId,
  termsTitle,
  termsVersion,
  signerName,
  sign = signDocument,
  hidden = {},
  viaLink = false,
  wrongHint = 'If anything is wrong, do not sign it. Ask for changes below. We would much rather fix it.',
}: {
  requestId: string;
  termsTitle: string | null;
  termsVersion: number | null;
  signerName: string;
  /** Where it posts: the portal's action, or the shared link's. */
  sign?: (previous: SignState, formData: FormData) => Promise<SignState>;
  hidden?: Record<string, string>;
  /** Opened from a link shared by hand, with no portal behind it. */
  viaLink?: boolean;
  /** What to do if something is wrong, which depends on what else is on the page. */
  wrongHint?: string;
}) {
  const [state, action, pending] = useActionState(sign, INITIAL);
  const [initials, setInitials] = useState('');

  if (state.status === 'done') {
    return (
      <p className={styles.notice} role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className={forms.field}>
        <label className={forms.label} htmlFor="initials">
          Your initials
        </label>
        <input
          id="initials"
          name="initials"
          className={forms.control}
          value={initials}
          onChange={(event) => setInitials(event.target.value)}
          maxLength={12}
          autoComplete="off"
          required
          disabled={pending}
          placeholder={signerName
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 4)
            .toUpperCase()}
        />
        <p className={forms.hint}>
          {viaLink
            ? 'Typed by you and recorded against your name and the time. That is what makes it a signature.'
            : 'Typed by you, recorded against your name, your email and the time. That is what makes it a signature.'}
        </p>
      </div>

      <label className={forms.checkRow} htmlFor="accept-doc">
        <input
          id="accept-doc"
          name="acceptDocument"
          type="checkbox"
          className={forms.check}
          required
          disabled={pending}
        />
        <span className={forms.checkText}>
          <span>I have read this document and agree to it</span>
          <span className={forms.hint}>{wrongHint}</span>
        </span>
      </label>

      {termsTitle && (
        <label className={forms.checkRow} htmlFor="accept-terms">
          <input
            id="accept-terms"
            name="acceptTerms"
            type="checkbox"
            className={forms.check}
            required
            disabled={pending}
          />
          <span className={forms.checkText}>
            <span>
              I accept the {termsTitle}
              {termsVersion ? `, version ${termsVersion}` : ''}
            </span>
            <span className={forms.hint}>
              Shown in full below. The exact version you accept is recorded, so it cannot change
              afterwards.
            </span>
          </span>
        </label>
      )}

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || initials.length === 0}>
          {pending ? 'Signing…' : 'Sign it'}
        </button>
        <p className={forms.payoff}>
          {viaLink
            ? 'You can save a copy as a PDF from this page.'
            : 'You will get a copy, and it stays in your portal.'}
        </p>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

type Intent = 'changes' | 'decline';

const WORDING: Record<
  Intent,
  { open: string; title: string; hint: string; submit: string; working: string }
> = {
  changes: {
    open: 'Ask for changes',
    title: 'What should change?',
    hint: 'We will read it, make the changes and send you a new version to sign. This one stays here in the meantime, so you can still sign it if we talk it through.',
    submit: 'Send it to us',
    working: 'Sending…',
  },
  decline: {
    open: 'I cannot sign this',
    title: 'Why not?',
    hint: 'This closes the request. Nothing is signed, nothing is charged, and we will come back to you. A new version would arrive as a fresh request.',
    submit: 'Decline it',
    working: 'Recording…',
  },
};

/**
 * The other answers.
 *
 * Kept off the signing form and behind a press each, so none is something you
 * can hit by accident while reaching for the button that matters — but all are
 * on the page, because a page that only lets you say yes is not asking
 * anything.
 *
 * Once they have asked for changes in words, only the wording option is left:
 * the note is recorded and a second note would replace nothing, but "here is
 * how I would put it" is a natural follow-up.
 */
export function RespondForm({
  requestId,
  body,
  answered = false,
  respond = respondToDocument,
  hidden = {},
  wording = true,
  decline = true,
}: {
  requestId: string;
  /** The version they are reading, which the wording option starts from. */
  body: string;
  answered?: boolean;
  /** Where it posts: the portal's action, or the shared link's. */
  respond?: (previous: SignState, formData: FormData) => Promise<SignState>;
  hidden?: Record<string, string>;
  /** Whether to offer their own wording, which needs the portal. */
  wording?: boolean;
  /** Whether they may decline it, which only the person who signs may. */
  decline?: boolean;
}) {
  const [state, action, pending] = useActionState(respond, INITIAL);
  const [intent, setIntent] = useState<Intent | 'wording' | null>(null);
  // Controlled, so a rejected submission does not hand back an empty box.
  // React resets an uncontrolled form once the action returns, and asking
  // somebody to retype the reason they cannot sign is how you stop hearing it.
  const [note, setNote] = useState('');

  if (state.status === 'done') {
    return (
      <p className={styles.notice} role="status">
        {state.message}
      </p>
    );
  }

  if (intent === 'wording') {
    return <SuggestWording requestId={requestId} body={body} onBack={() => setIntent(null)} />;
  }

  if (!intent) {
    return (
      <div className={forms.actions}>
        {!answered && (
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            onClick={() => setIntent('changes')}
          >
            {WORDING.changes.open}
          </button>
        )}
        {wording && (
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            onClick={() => setIntent('wording')}
          >
            Suggest your own wording
          </button>
        )}
        {!answered && decline && (
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            onClick={() => setIntent('decline')}
          >
            {WORDING.decline.open}
          </button>
        )}
      </div>
    );
  }

  const words = WORDING[intent];

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="intent" value={intent} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className={forms.field}>
        <label className={forms.label} htmlFor="respond-note">
          {words.title}
        </label>
        <textarea
          id="respond-note"
          name="note"
          className={forms.control}
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          disabled={pending}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className={forms.hint}>{words.hint}</p>
      </div>

      <div className={forms.actions}>
        <button
          type="submit"
          className={`${forms.button} ${intent === 'decline' ? forms.danger : ''}`}
          disabled={pending}
        >
          {pending ? words.working : words.submit}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setIntent(null)}
          disabled={pending}
        >
          Back
        </button>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * Their own wording.
 *
 * The editor opens on exactly the version they are reading, so they change
 * what they want and leave the rest. Sending is held back until they have
 * changed something: an untouched copy would only be refused.
 */
function SuggestWording({
  requestId,
  body,
  onBack,
}: {
  requestId: string;
  body: string;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState(suggestWording, INITIAL);
  const [touched, setTouched] = useState(false);
  // Controlled for the same reason as the note above.
  const [note, setNote] = useState('');

  if (state.status === 'done') {
    return (
      <p className={styles.notice} role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />

      <RichText
        name="body"
        label="Your wording"
        profile="document"
        initialMarkdown={body}
        minHeight="tall"
        disabled={pending}
        onMarkdownChange={() => setTouched(true)}
        hint="Change the text so it reads the way you want. Leave the rest as it is."
      />

      <TextAreaField
        name="note"
        label="A note for us"
        optional
        hint="Anything that helps us understand the change."
        rows={3}
        maxLength={4000}
        disabled={pending}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || !touched}>
          {pending ? 'Sending…' : 'Send your wording'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={onBack}
          disabled={pending}
        >
          Back
        </button>
        <p className={forms.payoff}>
          We will send you a new version to sign. You can still sign this one in the meantime.
        </p>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * The time to sign ran out. One press tells us, and we send a fresh copy.
 */
export function AskAgain({
  requestId,
  ask = askForFreshSigningCopy,
  hidden = {},
}: {
  requestId: string;
  /** Where it posts: the portal's action, or the shared link's. */
  ask?: (previous: SignState, formData: FormData) => Promise<SignState>;
  hidden?: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(ask, INITIAL);

  // Shown inside the notice that explains why, so no box of its own.
  if (state.status === 'done') return <p role="status">{state.message}</p>;

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Ask us to send it again'}
        </button>
        <p className={forms.payoff}>Nothing is lost. We will send you a fresh copy to sign.</p>
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
