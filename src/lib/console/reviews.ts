import type { Prisma, ProjectStatus, ReviewStatus } from '@/generated/prisma/client';

/**
 * Reviews: a version of the work put in front of the client, answered with
 * an approval or a list of changes.
 *
 * At most one is open per project, and only while the project is with the
 * client for review. Asking for a new round takes back the open one, and so
 * does the project moving on, so the client is never asked to approve a
 * version the team has already replaced.
 */

/** Where the work is far enough along to show, and a review can be asked for. */
export const REVIEWABLE: ProjectStatus[] = ['in_progress', 'client_review', 'launch_ready'];

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  open: 'Waiting on the client',
  approved: 'Approved',
  changes_requested: 'Changes asked for',
  withdrawn: 'Taken back',
};

export const CLIENT_REVIEW_LABEL: Record<ReviewStatus, string> = {
  open: 'Waiting on you',
  approved: 'You approved it',
  changes_requested: 'You asked for changes',
  withdrawn: 'Replaced by a newer version',
};

/** Takes back the open review, inside the caller's transaction. */
export async function withdrawOpenReviews(tx: Prisma.TransactionClient, projectId: string) {
  const result = await tx.projectReview.updateMany({
    where: { projectId, status: 'open' },
    data: { status: 'withdrawn', withdrawnAt: new Date() },
  });
  return result.count;
}
