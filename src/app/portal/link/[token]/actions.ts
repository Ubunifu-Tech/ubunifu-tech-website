'use server';

import { revalidatePath } from 'next/cache';
import { formText } from '@/lib/console/form';
import { markSignatureRequestViewed } from '@/lib/console/documents';
import { recordReviewAnswer } from '@/lib/console/review-answers';
import { readSharedLink } from '@/lib/console/shared-links';
import { recordSignature } from '@/lib/console/signing';
import { askForFreshCopy, recordDocumentAnswer } from '@/lib/console/document-answers';
import type { SignState } from '../../documents/actions';
import type { AnswerState } from '../../projects/[slug]/review-actions';

/**
 * What a link shared by hand lets its person do. The link itself is the
 * permission, checked afresh on every post: a link that was replaced, ran
 * out, or belongs to someone whose access was turned off does nothing.
 */

const GONE = 'This link has run out or was replaced. Ask Ubunifu for a new one.';

export async function signWithLink(_previous: SignState, formData: FormData): Promise<SignState> {
  const link = await readSharedLink(formText(formData, 'token'));
  if (!link || link.thing !== 'SignatureRequest') return { status: 'error', message: GONE };

  const result = await recordSignature({
    requestId: link.thingId,
    signer: link.contact,
    initials: String(formData.get('initials') ?? ''),
    acceptedDocument: formData.get('acceptDocument') === 'on',
    acceptedTerms: formData.get('acceptTerms') === 'on',
    via: 'shared_link',
  });
  revalidatePath('/portal/link', 'layout');
  return result;
}

/** Asking for changes, or declining, through the link. */
export async function respondWithLink(_previous: SignState, formData: FormData): Promise<SignState> {
  const link = await readSharedLink(formText(formData, 'token'));
  if (!link || link.thing !== 'SignatureRequest') return { status: 'error', message: GONE };

  return recordDocumentAnswer({
    requestId: link.thingId,
    person: link.contact,
    intent: formText(formData, 'intent'),
    note: formText(formData, 'note'),
    via: 'shared_link',
  });
}

/** The time to sign ran out: asking us to send it again, through the link. */
export async function askAgainWithLink(_previous: SignState, formData: FormData): Promise<SignState> {
  const link = await readSharedLink(formText(formData, 'token'));
  if (!link || link.thing !== 'SignatureRequest') return { status: 'error', message: GONE };

  return askForFreshCopy({ requestId: link.thingId, person: link.contact, via: 'shared_link' });
}

export async function answerWithLink(
  _previous: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const link = await readSharedLink(formText(formData, 'token'));
  if (!link || link.thing !== 'ProjectReview') return { status: 'error', message: GONE };

  const result = await recordReviewAnswer({
    reviewId: link.thingId,
    person: link.contact,
    decision: formText(formData, 'decision'),
    answer: formText(formData, 'answer'),
    via: 'shared_link',
  });
  revalidatePath('/portal/link', 'layout');
  return result;
}

/**
 * Records that the document was opened, from the page once it is showing in
 * a browser. Not from the page load itself: a chat app fetching the link for
 * its preview would otherwise count as the client opening it.
 */
export async function markLinkOpened(token: string): Promise<void> {
  const link = await readSharedLink(token);
  if (link?.thing === 'SignatureRequest') await markSignatureRequestViewed(link.thingId);
}
