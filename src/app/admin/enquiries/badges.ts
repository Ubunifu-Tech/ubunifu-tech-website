import type { EnquiryStatus } from '@/generated/prisma/client';
import forms from '@/styles/forms.module.css';

/** The badge an enquiry wears for its status, in the list and on its page. */
export const STATUS_BADGE: Record<EnquiryStatus, string> = {
  new: forms.badgeWarn,
  triaged: '',
  in_conversation: forms.badgeLive,
  qualified: forms.badgeLive,
  converted: forms.badgeGood,
  declined: '',
  spam: forms.badgeBad,
};
