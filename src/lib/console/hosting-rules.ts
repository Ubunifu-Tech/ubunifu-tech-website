import { businessDay, formatShortDate, isPastDay } from './money';

/**
 * When a client's hosting may be paused, as plain rules with no database and
 * no network, so the page, the action and the check script all read the same
 * answer.
 *
 * Pausing takes a client's site off the internet. It is allowed only for an
 * invoice that is overdue today and that the client has been told about: a
 * recorded overdue notice, dated after the invoice fell due. A person presses
 * the button, and only an owner can.
 */

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
 * The notice that counts for an invoice: the latest one given after it fell
 * due. A notice from before the due date, or from before the date was moved
 * later, told the client about a debt that was not yet late.
 */
export function standingNotice(invoice: HostingInvoice): { givenAt: Date } | null {
  if (!invoice.dueAt) return null;
  const due = businessDay(invoice.dueAt);
  return (
    invoice.notices
      .filter((notice) => businessDay(notice.givenAt) > due)
      .sort((a, b) => b.givenAt.getTime() - a.givenAt.getTime())[0] ?? null
  );
}

export type PauseStanding =
  | { allowed: true; invoice: HostingInvoice; notice: { givenAt: Date } }
  | { allowed: false; reason: string };

/**
 * Whether hosting can be paused now, and for which invoice. Among overdue
 * invoices with a notice, the one that has been overdue longest is named.
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
  for (const invoice of overdue) {
    const notice = standingNotice(invoice);
    if (notice) return { allowed: true, invoice, notice };
  }
  const numbers = overdue.map((invoice) => invoice.number);
  return {
    allowed: false,
    reason:
      numbers.length === 1
        ? `${numbers[0]} is overdue, but no overdue notice is recorded for it. Tell the client, then record the notice on the invoice's page.`
        : `${numbers.join(', ')} are overdue, but no overdue notice is recorded for any of them. Tell the client, then record the notice on the invoice's page.`,
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
