/**
 * The typed confirmation behind removing a client or a project.
 *
 * Shared by the form, which only enables its button once the name matches,
 * and by the server action, which checks again because a posted form proves
 * nothing. Case and spacing are forgiven: the point is that somebody read the
 * name and meant it, not that they matched its capitals.
 */
export function namesMatch(typed: string, name: string): boolean {
  const plain = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  return plain(typed) !== '' && plain(typed) === plain(name);
}

/** What a removal action hands back. Success redirects, so only failure is said. */
export type RemovalState = { status: 'idle' | 'error'; message?: string };
