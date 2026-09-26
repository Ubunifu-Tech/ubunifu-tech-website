import 'server-only';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { alertTeam } from './alerts';
import { consoleEnv } from './env';
import { reviewAnsweredEmail } from '@/lib/emails';

export type AnswerOutcome = { status: 'done' | 'error'; message: string };

/**
 * The client's answer to a review: approved, or changes asked for.
 *
 * Anyone on the client's team can answer, from the portal or through a link
 * shared by hand, and the answer records who did and which way it came.
 * It is written once, on the condition that the round is still open, so two
 * colleagues answering at the same moment cannot both be recorded, and an
 * answer cannot land on a round the team has since taken back.
 */
export async function recordReviewAnswer(input: {
  reviewId: string;
  person: { id: string; name: string; email: string | null; clientId: string; clientName: string };
  decision: string;
  answer: string;
  via: 'portal' | 'shared_link';
}): Promise<AnswerOutcome> {
  const actor = input.person;
  const reviewId = input.reviewId;
  const decision = input.decision;
  const answer = input.answer.trim().slice(0, 4000);

  if (decision !== 'approve' && decision !== 'changes') {
    return { status: 'error', message: 'Choose whether to approve it or ask for changes.' };
  }
  const approved = decision === 'approve';
  if (!approved && answer.length < 5) {
    return { status: 'error', message: 'Say what you would like changed.' };
  }

  const review = await db.projectReview.findFirst({
    where: { id: reviewId, project: { clientId: actor.clientId, deletedAt: null } },
    select: {
      id: true,
      round: true,
      title: true,
      status: true,
      project: {
        select: {
          id: true,
          slug: true,
          name: true,
          owner: { select: { email: true, isActive: true } },
        },
      },
    },
  });
  if (!review) return { status: 'error', message: 'That review is no longer here.' };

  const saved = await db.projectReview.updateMany({
    where: { id: review.id, status: 'open' },
    data: {
      status: approved ? 'approved' : 'changes_requested',
      answeredById: actor.id,
      answeredAt: new Date(),
      answer: answer || null,
    },
  });
  if (saved.count !== 1) {
    return {
      status: 'error',
      message:
        'This round was already answered, or replaced by a newer one. Reload to see the latest.',
    };
  }

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: approved ? 'review.approved' : 'review.changes_requested',
    entityType: 'Project',
    entityId: review.project.id,
    summary: `Round ${review.round}: ${review.title}${
      input.via === 'shared_link' ? ', through a link shared by hand' : ''
    }`,
    metadata: { via: input.via, ...(answer ? { answer } : {}) },
  });

  await alertTeam({
    owner: review.project.owner,
    subject: `${review.project.name}: ${approved ? 'approved' : 'changes asked for'} (round ${review.round})`,
    html: reviewAnsweredEmail({
      clientName: actor.clientName,
      from: actor.name,
      projectName: review.project.name,
      round: review.round,
      title: review.title,
      approved,
      answer: answer || null,
      url: `${consoleEnv.adminOrigin}/projects/${review.project.slug}#review`,
    }),
    template: approved ? 'review_approved' : 'review_changes_requested',
    entityType: 'Project',
    entityId: review.project.id,
    replyTo: actor.email,
  });

  revalidatePath(`/portal/projects/${review.project.slug}`);
  revalidatePath('/portal');
  revalidatePath(`/admin/projects/${review.project.slug}`);
  revalidatePath('/admin');

  return {
    status: 'done',
    message: approved
      ? 'Thank you. Your approval is recorded, and the team can see it.'
      : 'Thank you. The team can see your changes and will come back to you with a new version.',
  };
}
