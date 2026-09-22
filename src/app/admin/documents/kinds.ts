/** Document kinds as staff choose them. Client-safe. */
export const DOCUMENT_KINDS = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'contract', label: 'Agreement' },
  { value: 'statement_of_work', label: 'Statement of work' },
  { value: 'change_order', label: 'Change order' },
  { value: 'handover', label: 'Handover pack' },
  { value: 'other', label: 'Something else' },
] as const;
