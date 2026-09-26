'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
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
  const reviewId = formText(formData, 'reviewId');
  const answered = await recordReviewAnswer({
    reviewId,
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
  if (answered.status !== 'done') return answered;
  // To the answered round, which says what they said, with a thank-you over
  // it: the round they were answering has moved down the page.
  const review = await db.projectReview.findFirst({
    where: { id: reviewId, project: { clientId: actor.clientId } },
    select: { project: { select: { slug: true } } },
  });
  redirect(review ? `/portal/projects/${review.project.slug}?answered=review#review` : '/portal');
}
