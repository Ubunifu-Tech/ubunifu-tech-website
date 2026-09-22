/**
 * Two people doing the same thing at the same moment.
 *
 * References (INV-2026-014, TCK-2026-003…) are "the last one plus one", read
 * inside a transaction. Two transactions can read the same last one, and the
 * unique index then refuses the second. That is the database doing its job;
 * the right answer is to run the whole transaction again, which reads the new
 * last one. Anything other than a unique clash is not retried.
 */
export function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

export async function retryOnConflict<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isUniqueConflict(error) || attempt >= attempts) throw error;
    }
  }
}
