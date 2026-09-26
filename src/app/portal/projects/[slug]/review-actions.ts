'use server';

import { requireClient } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { recordReviewAnswer } from '@/lib/console/review-answers';

export type AnswerState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Answering a review from the portal, as the person signed in. */
export async function answerReview(
  _previous: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const actor = await requireClient();
  return recordReviewAnswer({
    reviewId: formText(formData, 'reviewId'),
    person: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      clientId: actor.clientId,
      clientName: actor.clientName,
    },
    decision: formText(formData, 'decision'),
    answer: formText(formData, 'answer'),
    via: 'portal',
  });
}
