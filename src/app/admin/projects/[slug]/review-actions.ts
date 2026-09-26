'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { formText } from '@/lib/console/form';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { STAFF_LABEL } from '@/lib/console/project-status';
import { REVIEWABLE, withdrawOpenReviews } from '@/lib/console/reviews';
import { advanceForReview } from '@/lib/console/transitions';
import { reviewRequestEmail } from '@/lib/emails';
import { issueSharedLink } from '@/lib/console/shared-links';
import { whatsappLink } from '@/lib/console/whatsapp';

export type ReviewState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  /** The round was sent to the portal, but some emails did not go. */
  unsent?: boolean;
};

/**
 * Puts a version of the work in front of the client to approve or send back.
 *
 * One round at a time: a new round takes back the one still open, so the
 * client only ever has the latest version to answer. The first round moves
 * the project to review; later rounds leave it there.
 */
export async function askForReview(
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const projectId = formText(formData, 'projectId');
  const title = formText(formData, 'title').slice(0, 160);
  const previewUrl = formText(formData, 'previewUrl');
  const note = formText(formData, 'note').slice(0, 4000);

  if (title.length < 3) {
    return {
      status: 'error',
      message: 'Say what they are looking at, like "The home and about pages".',
    };
  }
  if (previewUrl) {
    try {
      const parsed = new URL(previewUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
    } catch {
      return {
        status: 'error',
        message: 'The link should be a full address, starting with https://',
      };
    }
  }

  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      client: {
        select: {
          name: true,
          contacts: {
            where: { deletedAt: null, canSignIn: true },
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };
  if (!REVIEWABLE.includes(project.status)) {
    return {
      status: 'error',
      message: `Reviews are for work under way, and this project is at ${STAFF_LABEL[project.status].toLowerCase()}.`,
    };
  }

  let review: { id: string; round: number };
  try {
    review = await db.$transaction(async (tx) => {
      // Locked on the project, so two rounds asked for at once cannot take
      // the same number, and a move made meanwhile is seen.
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${project.id} FOR UPDATE`;
      const current = await tx.project.findUnique({
        where: { id: project.id },
        select: { status: true, deletedAt: true },
      });
      if (!current || current.deletedAt || !REVIEWABLE.includes(current.status)) {
        throw new Error('moved');
      }

      await withdrawOpenReviews(tx, project.id);
      const last = await tx.projectReview.aggregate({
        where: { projectId: project.id },
        _max: { round: true },
      });
      const created = await tx.projectReview.create({
        data: {
          projectId: project.id,
          round: (last._max.round ?? 0) + 1,
          title,
          previewUrl: previewUrl || null,
          note: note || null,
          askedById: staff.id,
        },
        select: { id: true, round: true },
      });
      await advanceForReview(tx, {
        projectId: project.id,
        round: created.round,
        title,
        actorType: 'staff',
        actorId: staff.id,
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'moved') {
      return {
        status: 'error',
        message: 'This project moved on while the page was open. Reload and try again.',
      };
    }
    throw error;
  }

  // Somebody still setting up from a shared link has no email yet; they see
  // the review in their portal once they are in.
  const emailable = project.client.contacts.flatMap((contact) =>
    contact.email ? [{ ...contact, email: contact.email }] : [],
  );
  let delivered = 0;
  for (const contact of emailable) {
    const sent = await sendConsoleEmail({
      to: contact.email,
      subject: `${project.name}: ready for your review`,
      html: reviewRequestEmail({
        name: contact.name,
        projectName: project.name,
        round: review.round,
        title,
        note: note || null,
        previewUrl: previewUrl || null,
        url: `${consoleEnv.publicOrigin}/portal/projects/${project.slug}#review`,
      }),
      template: 'review_request',
      entityType: 'Project',
      entityId: project.id,
    });
    if (sent.ok) delivered += 1;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action:
      emailable.length > 0 && delivered < emailable.length ? 'review.send_failed' : 'review.asked',
    entityType: 'Project',
    entityId: project.id,
    summary: `Round ${review.round}: ${title}. Emailed ${delivered} of ${emailable.length}`,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  revalidatePath('/admin/projects');
  revalidatePath('/admin');

  if (emailable.length === 0) {
    return {
      status: 'done',
      message: `Round ${review.round} is in their portal. Nobody at ${project.client.name} has an email yet, so nobody was emailed.`,
    };
  }
  if (delivered < emailable.length) {
    // Done, not an error: the round exists, and sending it again would
    // make a second round rather than resend this one.
    return {
      status: 'done',
      unsent: true,
      message: `Round ${review.round} is in their portal, but only ${delivered} of ${emailable.length} emails went out. See Activity for why.`,
    };
  }
  return {
    status: 'done',
    message: `Round ${review.round} is with ${project.client.name}. Emailed to ${delivered}.`,
  };
}

export type ShareReviewState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  url?: string;
  whatsapp?: string;
  /** Who the link is for. */
  name?: string;
};

/**
 * A link for their main contact to open the round and approve it or ask for
 * changes, without email or the portal, for sending by hand. Any earlier
 * shared link for the round stops working.
 */
export async function shareReviewLink(
  _previous: ShareReviewState,
  formData: FormData,
): Promise<ShareReviewState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const review = await db.projectReview.findFirst({
    where: { id: formText(formData, 'reviewId'), status: 'open', project: { deletedAt: null } },
    select: {
      id: true,
      round: true,
      title: true,
      project: {
        select: {
          id: true,
          slug: true,
          name: true,
          client: {
            select: {
              country: true,
              contacts: {
                where: { deletedAt: null, isPrimary: true, canSignIn: true },
                select: { id: true, name: true, phone: true },
              },
            },
          },
        },
      },
    },
  });
  if (!review) return { status: 'error', message: 'That round is no longer waiting on them.' };
  const person = review.project.client.contacts[0];
  if (!person) {
    return { status: 'error', message: 'Their main contact has no portal access, so a link would not open.' };
  }

  const url = await issueSharedLink({
    contactId: person.id,
    thing: 'ProjectReview',
    thingId: review.id,
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'review.link_shared',
    entityType: 'Project',
    entityId: review.project.id,
    summary: `Round ${review.round}: a link for ${person.name} to answer, to share by hand`,
  });
  revalidatePath(`/admin/projects/${review.project.slug}`);

  const first = person.name.split(' ')[0] ?? person.name;
  const message =
    `Hello ${first}, this is Ubunifu Technologies. ${review.title} for ${review.project.name} ` +
    `is ready for you to look at: ${url}\n\nOpen it to approve it or tell us what to change. ` +
    `There is nothing to set up. The link is just for you and lasts 14 days.`;
  return {
    status: 'done',
    url,
    name: person.name,
    whatsapp: whatsappLink(person.phone, review.project.client.country, message),
  };
}
