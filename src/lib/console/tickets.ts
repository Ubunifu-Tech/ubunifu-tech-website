/**
 * Support, change requests and everything else a client asks for after launch.
 *
 * Labels only, and no server imports — the portal's own form is a client
 * component, and a constant living beside a database call would drag Prisma
 * into the browser bundle. The reference generator lives with the action that
 * uses it.
 *
 * The vocabulary is split the same way as project status: what staff need to
 * see, and what the client needs to see. A client who is told their request is
 * "triaged" learns nothing; "we have read it" is the same fact in words they
 * can act on.
 */

export const TICKET_KIND_LABEL: Record<string, string> = {
  support: 'Something is wrong',
  bug: 'Something is broken',
  change_request: 'A change to the site',
  content_update: 'New or updated content',
  question: 'A question',
};

/** What the client picks from. Ordered by how often it is the right answer. */
export const TICKET_KINDS = [
  { value: 'content_update', label: 'New or updated content', hint: 'Text, photographs, a new page.' },
  { value: 'change_request', label: 'A change to the site', hint: 'Something should work or look different.' },
  { value: 'bug', label: 'Something is broken', hint: 'It used to work, or it does not work at all.' },
  { value: 'support', label: 'Something is wrong', hint: 'Email, the domain, hosting.' },
  { value: 'question', label: 'A question', hint: 'You are not sure what you need.' },
] as const;

export const STAFF_TICKET_STATUS: Record<string, string> = {
  open: 'Unread',
  triaged: 'Read',
  in_progress: 'Being worked on',
  waiting_on_client: 'Waiting on them',
  resolved: 'Done',
  closed: 'Closed',
};

export const CLIENT_TICKET_STATUS: Record<string, string> = {
  open: 'Sent to us',
  triaged: 'We have read it',
  in_progress: 'We are on it',
  waiting_on_client: 'Waiting on you',
  resolved: 'Done',
  closed: 'Closed',
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/** Statuses that mean somebody at Ubunifu still has to do something. */
export const OPEN_TO_US = ['open', 'triaged', 'in_progress'] as const;
