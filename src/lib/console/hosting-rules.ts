import { businessDay, daysBetween, formatShortDate, isPastDay } from './money';

/**
 * When a client's hosting may be paused, as plain rules with no database and
 * no network, so the page, the action and the check script all read the same
 * answer.
 *
 * Pausing takes a client's site off the internet. It is allowed only for an
 * invoice that is overdue today and that the client was told about at least
 * NOTICE_DAYS ago: a recorded overdue notice, dated after the invoice fell
 * due. A person presses the button, and only an owner can.
 */

/**
 * How long the client has to pay or answer after being told, before their
 * hosting can be paused. Counted in days on Tanzania's calendar from the day
 * the notice was given: a notice given on the 1st allows a pause on the 8th.
 */
export const NOTICE_DAYS = 7;

/** A Vercel project id as Vercel writes it: prj_ and letters or digits. */
export const VERCEL_PROJECT_ID = /^prj_[A-Za-z0-9]{6,60}$/;

export const NOTICE_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone call' },
  { value: 'in_person', label: 'In person' },
  { value: 'letter', label: 'Letter' },
] as const;

export type NoticeChannel = (typeof NOTICE_CHANNELS)[number]['value'];

export function noticeChannelLabel(value: string): string {
  return NOTICE_CHANNELS.find((channel) => channel.value === value)?.label ?? value;
}

export type HostingInvoice = {
  number: string;
  status: string;
  dueAt: Date | null;
  totalMinor: number;
  paidMinor: number;
  notices: { givenAt: Date }[];
};

/** Issued, still owed, and past its due date today. */
export function isOverdue(invoice: Omit<HostingInvoice, 'number' | 'notices'>, now: Date): boolean {
  const issued = invoice.status === 'sent' || invoice.status === 'part_paid' || invoice.status === 'overdue';
  return issued && invoice.paidMinor < invoice.totalMinor && isPastDay(invoice.dueAt, now);
}

/**
 * The notice that counts for an invoice: the first one given after it fell
 * due. A notice from before the due date, or from before the date was moved
 * later, told the client about a debt that was not yet late. The first counts
 * and not the latest, so a reminder sent later does not start the wait again.
 */
export function standingNotice(invoice: HostingInvoice): { givenAt: Date } | null {
  if (!invoice.dueAt) return null;
  const due = businessDay(invoice.dueAt);
  return (
    invoice.notices
      .filter((notice) => businessDay(notice.givenAt) > due)
      .sort((a, b) => a.givenAt.getTime() - b.givenAt.getTime())[0] ?? null
  );
}

/** The first day a pause is allowed after a notice given on this day. */
export function pauseAllowedFrom(givenAt: Date): Date {
  return new Date(givenAt.getTime() + NOTICE_DAYS * 86_400_000);
}

export type PauseStanding =
  | { allowed: true; invoice: HostingInvoice; notice: { givenAt: Date } }
  | { allowed: false; reason: string };

/**
 * Whether hosting can be paused now, and for which invoice. Among overdue
 * invoices whose notice is old enough, the one overdue longest is named. When
 * a notice is on record but the wait is not over, the refusal says which day
 * it ends.
 */
export function pauseStanding(input: {
  linked: boolean;
  pausedAt: Date | null;
  invoices: HostingInvoice[];
  now: Date;
}): PauseStanding {
  if (!input.linked) return { allowed: false, reason: 'No Vercel project is linked.' };
  if (input.pausedAt) {
    return { allowed: false, reason: `Hosting has been paused since ${formatShortDate(input.pausedAt)}.` };
  }
  const overdue = input.invoices
    .filter((invoice) => isOverdue(invoice, input.now))
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
  if (overdue.length === 0) {
    return { allowed: false, reason: 'No invoice on this project is overdue, so there is nothing to pause for.' };
  }

  const told = overdue.flatMap((invoice) => {
    const notice = standingNotice(invoice);
    return notice ? [{ invoice, notice }] : [];
  });
  const ready = told.find(({ notice }) => daysBetween(notice.givenAt, input.now) >= NOTICE_DAYS);
  if (ready) return { allowed: true, ...ready };

  // Told, but not long enough ago: the one whose wait ends first.
  const soonest = [...told].sort((a, b) => a.notice.givenAt.getTime() - b.notice.givenAt.getTime())[0];
  if (soonest) {
    return {
      allowed: false,
      reason: `The client was given notice about ${soonest.invoice.number} on ${formatShortDate(soonest.notice.givenAt)}. Hosting can be paused from ${formatShortDate(pauseAllowedFrom(soonest.notice.givenAt))}, ${NOTICE_DAYS} days after the notice, if it is still unpaid.`,
    };
  }

  const numbers = overdue.map((invoice) => invoice.number);
  const then = `Tell the client, then record the notice on the invoice's page. Hosting can be paused ${NOTICE_DAYS} days after that.`;
  return {
    allowed: false,
    reason:
      numbers.length === 1
        ? `${numbers[0]} is overdue, but no overdue notice is recorded for it. ${then}`
        : `${numbers.join(', ')} are overdue, but no overdue notice is recorded for any of them. ${then}`,
  };
}

/** Why a notice cannot be recorded as given on this day, or null when it can. */
export function noticeDayProblem(
  invoice: { dueAt: Date | null },
  givenAt: Date,
  now: Date,
): string | null {
  if (businessDay(givenAt) > businessDay(now)) return 'That day has not come yet. Record a notice once it has been given.';
  if (!invoice.dueAt || businessDay(givenAt) <= businessDay(invoice.dueAt)) {
    return `An overdue notice is one given after the due date${invoice.dueAt ? `, ${formatShortDate(invoice.dueAt)}` : ''}.`;
  }
  return null;
}
