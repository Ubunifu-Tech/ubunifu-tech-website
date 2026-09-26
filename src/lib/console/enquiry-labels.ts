import type { EnquiryStatus } from '@/generated/prisma/client';

/** An enquiry's state, in the words the Enquiries page uses. */
export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'Unread',
  triaged: 'Read',
  in_conversation: 'Talking',
  qualified: 'Worth a proposal',
  converted: 'Became a client',
  declined: 'Not for us',
  spam: 'Spam',
};
