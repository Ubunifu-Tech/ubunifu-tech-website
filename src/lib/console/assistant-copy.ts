import 'server-only';
import type { AgentFailure } from './agent';

type FailureCopy = {
  /** One sentence, shown above the way to reach a person. */
  text: string;
  /** Whether the window opens its "send it to the team" form under it. */
  fallback: boolean;
};

/**
 * Why a turn got no reply, said once and plainly, for the website chat. Where
 * the assistant cannot help, the form to reach a person opens under the
 * sentence; where trying again is the answer, the text goes back into the box.
 * A full or stale thread is never shown: a fresh one starts instead.
 */
export const SITE_FAILURE_COPY: Record<AgentFailure, FailureCopy> = {
  declined: { text: 'That is not something the assistant can answer.', fallback: true },
  unavailable: { text: 'The assistant is not available right now.', fallback: true },
  not_configured: { text: 'The assistant is not available right now.', fallback: true },
  busy: { text: 'The assistant is busy right now.', fallback: true },
  stuck: { text: 'The assistant could not finish that one.', fallback: true },
  too_long: { text: 'The assistant could not finish that one.', fallback: true },
  cut_short: { text: 'That reply did not come through. Try asking again.', fallback: false },
  empty: { text: 'That reply did not come through. Try asking again.', fallback: false },
  thread_full: { text: 'The assistant could not finish that one.', fallback: true },
  closed: { text: 'The assistant could not finish that one.', fallback: true },
  missing: { text: 'The assistant could not finish that one.', fallback: true },
};

/** The portal's Help chat says the same, and its fallback is a request to the team. */
export const PORTAL_FAILURE_COPY: Record<AgentFailure, FailureCopy> = SITE_FAILURE_COPY;

/** The chat's own limits, before the model is asked. */
export const LIMIT_COPY = {
  /** One visitor, or one address, asking a lot in an hour. */
  visitor: { text: 'That is a lot of questions for one hour.', fallback: true },
  /** The whole site's hourly or daily ceiling. */
  site: { text: 'The chat is very busy right now.', fallback: true },
} satisfies Record<string, FailureCopy>;

/**
 * What each surface says when a turn produced no reply. The agent reports a
 * cause; the words are chosen here, per surface.
 *
 * Interim: the sentences the surfaces used before causes existed, until each
 * surface gets its own wording.
 */
export function interimFailure(cause: AgentFailure): string {
  switch (cause) {
    case 'missing':
      return 'That conversation no longer exists.';
    case 'closed':
      return 'This conversation has been closed.';
    case 'thread_full':
      return 'This conversation has gone on long enough that it is better continued by a person.';
    case 'declined':
      return 'The assistant declined to answer that one. A person can help instead.';
    case 'cut_short':
      return 'The answer ran too long to finish. Try a narrower question.';
    case 'too_long':
      return 'This conversation is too long to carry on here.';
    case 'empty':
      return 'The assistant returned nothing. Try asking again.';
    case 'stuck':
      return 'The assistant got stuck going round in circles. A person can help instead.';
    case 'not_configured':
      return 'The assistant is not configured here.';
    case 'busy':
      return 'Too many people are asking at once. Try again in a moment.';
    case 'unavailable':
      return 'The assistant could not answer just now.';
  }
}
