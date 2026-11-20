/**
 * What can still change on an invoice that has been issued.
 *
 * What a client was sent stands: an emailed invoice is never edited, only
 * voided and raised again. An invoice issued by a payment and never emailed is
 * a different thing, a draft in all but name, and fixing its due date should
 * not take a reversed receipt and a void. The portal is the line between the
 * two: everyone at the client who can sign in sees every issued invoice there,
 * so once one of them has signed in since it was issued, they may have seen it,
 * and it can only be given more time. Days are "YYYY-MM-DD", compared as text.
 */
export type IssuedEdit =
  | { kind: 'free' }
  | { kind: 'later'; reason: string }
  | { kind: 'locked'; reason: string };

export function issuedInvoiceEdit({
  status,
  outstandingMinor,
  emailed,
  seenInPortal,
}: {
  status: string;
  outstandingMinor: number;
  /** An invoice email to the client was accepted for delivery. */
  emailed: boolean;
  /** Someone at the client signed in to the portal after it was issued. */
  seenInPortal: boolean;
}): IssuedEdit {
  if (status === 'draft' || status === 'void') {
    return { kind: 'locked', reason: 'Only an issued invoice is changed here.' };
  }
  if (outstandingMinor <= 0) {
    return { kind: 'locked', reason: 'Nothing is owed on it, so there is no due date to change.' };
  }
  if (emailed) {
    return {
      kind: 'locked',
      reason: 'It was emailed to the client, so it stays as they have it. Void it and raise another to change it.',
    };
  }
  if (seenInPortal) {
    return {
      kind: 'later',
      reason: 'Someone at the client has signed in since it was issued, so it can only be given more time.',
    };
  }
  return { kind: 'free' };
}

/** A change the form asked for, checked against what the rule allows. */
export function checkIssuedEdit({
  edit,
  today,
  currentDue,
  nextDue,
  notesChanged,
}: {
  edit: IssuedEdit;
  today: string;
  currentDue: string | null;
  nextDue: string | null;
  notesChanged: boolean;
}): { error: string } | { ok: true } {
  if (edit.kind === 'locked') return { error: edit.reason };
  if (!nextDue) return { error: 'Enter the date it is due.' };
  if (edit.kind === 'later') {
    if (notesChanged) return { error: edit.reason };
    if (currentDue && nextDue < currentDue) return { error: edit.reason };
  }
  if (nextDue < today && nextDue !== currentDue) {
    return { error: 'The due date cannot be before today.' };
  }
  return { ok: true };
}
