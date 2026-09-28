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
