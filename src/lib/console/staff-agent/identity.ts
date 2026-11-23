/**
 * What the console's agent is called, in one place. It is one agent wherever
 * it appears: the panel beside every page, its own pages, the document editor
 * and the lines it leaves in Activity. Safe to import anywhere.
 */
export const COPILOT = {
  /** In full, where it is introduced. */
  name: 'Ubunifu Copilot',
  /** Everywhere else. */
  short: 'Copilot',
} as const;
