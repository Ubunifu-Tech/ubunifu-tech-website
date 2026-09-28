import 'server-only';
import type { AgentFailure } from './agent';

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
