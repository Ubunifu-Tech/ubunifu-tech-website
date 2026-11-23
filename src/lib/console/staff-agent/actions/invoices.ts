import 'server-only';
import { billableLines, type Billable } from '@/lib/console/billing';
import { formatDate, formatMoney, isPastDay, parseDateInput, toDateInputValue } from '@/lib/console/money';
import {
  billableName,
  createDraftInvoice,
  dueOnTerms,
  pickBillables,
  type PickedBillables,
} from '@/lib/console/services/invoices';
import { StepRefused } from './clients';
import { text, type PlanAction, type ProjectFacts } from './types';

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

type Wanted = { item: string; amount: string };

/** The items as the model sent them: a list of { item, amount? }, or plain names and numbers. */
function readItems(raw: unknown): Wanted[] | string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return 'Say what goes on the invoice: the numbers from get_project, under CAN BE INVOICED NOW.';
  }
  if (raw.length > 30) return 'That is too many lines for one invoice. Split it into two.';
  const wanted: Wanted[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      wanted.push({ item: text(entry, 200), amount: '' });
      continue;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'One of the invoice items could not be read.';
    const { item, amount } = entry as Record<string, unknown>;
    wanted.push({ item: text(item, 200), amount: text(amount, 40) });
  }
  if (wanted.some((entry) => !entry.item)) return 'One of the invoice items has no name or number.';
  return wanted;
}

/** One billable line by its number in the list, or by its name when only one has it. */
function findBillable(billable: Billable[], which: string, projectName: string): Billable | string {
  if (/^\d+$/.test(which)) {
    return (
      billable[Number(which) - 1] ??
      `Nothing is numbered ${which} under CAN BE INVOICED NOW on ${projectName}. Read the project again with get_project.`
    );
  }
  const exact = billable.filter((line) => sameName(billableName(line), which));
  const byFee = exact.length > 0 ? exact : billable.filter((line) => sameName(line.label, which));
  if (byFee.length === 1) return byFee[0]!;
  if (byFee.length > 1) {
    return `${byFee.length} periods of ${which} can be invoiced on ${projectName}. Use the number of the one meant, from get_project.`;
  }
  return `${which} cannot be invoiced on ${projectName} right now. It may be invoiced in full already, not due yet, or a fee this plan has still to add. Read the project with get_project and use what is under CAN BE INVOICED NOW.`;
}

type Value = { project: ProjectFacts; picked: PickedBillables; dueAt: Date; notes: string };

export const createInvoice: PlanAction<Value> = {
  name: 'create_invoice',
  label: 'Draft invoice',
  description:
    'Draft an invoice for a project from fees that can be invoiced now. It is saved as a draft and never sent from here: the person reads it and sends it from its own page. Read the project with get_project first and use the numbers under CAN BE INVOICED NOW. Each item is invoiced at the amount shown there, so never give an amount, except for a fee charged by usage, which needs this time\'s amount exactly as the person gave it. A fee added in the same plan cannot be invoiced until that plan has been confirmed.',
  permission: 'invoices',
  properties: {
    project: { type: 'string', description: 'The project reference, such as UBU-2026-004.' },
    items: {
      type: 'array',
      description: 'What goes on the invoice, one entry per line.',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'The number under CAN BE INVOICED NOW in get_project, such as "2". The exact name also works when only one line has it.' },
          amount: { type: 'string', description: 'Only for a fee charged by usage: this time\'s amount in the project\'s currency, digits only.' },
        },
        required: ['item'],
      },
    },
    due: { type: 'string', description: 'YYYY-MM-DD, only if the person gave a due date. Left out, it is due on the payment terms in Billing details.' },
    notes: { type: 'string', description: 'A note printed on the invoice for the client, only if the person asked for one.' },
  },
  required: ['project', 'items'],

  check: async (input, env) => {
    const project = await env.project(input.project);
    if (typeof project === 'string') return { ok: false, message: project };
    if (!project.id) {
      return {
        ok: false,
        message:
          'That project is only started when this plan is confirmed, so nothing on it can be invoiced yet. Leave the invoice out and offer it once the plan has been carried out.',
      };
    }

    const wanted = readItems(input.items);
    if (typeof wanted === 'string') return { ok: false, message: wanted };

    const billable = await billableLines(project.id);
    if (billable.length === 0) {
      return {
        ok: false,
        message: `Nothing on ${project.name} can be invoiced right now. Fees are invoiced in full already, or renew later.`,
      };
    }
    const amounts = new Map<string, string>();
    const chosen: Billable[] = [];
    for (const entry of wanted) {
      const line = findBillable(billable, entry.item, project.name);
      if (typeof line === 'string') return { ok: false, message: line };
      if (chosen.some((other) => other.key === line.key)) {
        return { ok: false, message: `${billableName(line)} is on the invoice twice. List it once.` };
      }
      if (line.usage && !entry.amount) {
        return { ok: false, message: `${line.label} is charged by usage. Ask what this time's amount is.` };
      }
      if (!line.usage && entry.amount) {
        return {
          ok: false,
          message: `${billableName(line)} is invoiced at ${formatMoney(line.amountMinor, line.currency)}, what is left of its price. Leave the amount out. A different price is set on the fee, on the project page.`,
        };
      }
      if (line.usage) amounts.set(line.key, entry.amount);
      chosen.push(line);
    }

    const picked = await pickBillables(
      project.id,
      chosen.map((line) => line.key),
      (key) => amounts.get(key),
    );
    if ('error' in picked) return { ok: false, message: picked.error };

    const dueRaw = text(input.due, 40);
    const dueAt = dueRaw ? parseDateInput(dueRaw) : await dueOnTerms();
    if (!dueAt) return { ok: false, message: 'That due date could not be read. Give it as YYYY-MM-DD.' };
    if (isPastDay(dueAt, new Date())) {
      return { ok: false, message: 'That due date has passed. Ask for a date from today on.' };
    }
    const notes = text(input.notes, 2000);
    const money = (minor: number) => formatMoney(minor, picked.currency);

    return {
      ok: true,
      value: { project, picked, dueAt, notes },
      subject: `${money(picked.totalMinor)} to ${project.clientName}`,
      details: [
        ...picked.lines.map((line) => `${billableName(line)}: ${money(line.amountMinor)}`),
        ...(picked.taxMinor > 0 ? [`VAT at ${picked.vatRateBps / 100}%: ${money(picked.taxMinor)}`] : []),
        `Due ${formatDate(dueAt)}`,
        `For ${project.name}`,
        ...(notes ? [`Note on the invoice: ${notes}`] : []),
        'Saved as a draft, not sent to the client',
      ],
      // The money and the date the person is shown. If any of it has moved by
      // the time they confirm, the step is refused instead of drafting
      // something they did not see.
      pin: [
        picked.currency,
        picked.totalMinor,
        picked.taxMinor,
        toDateInputValue(dueAt),
        ...picked.lines.map((line) => `${line.key}=${line.amountMinor}`),
      ].join('|'),
    };
  },

  run: async ({ picked, dueAt, notes }, env) => {
    const created = await createDraftInvoice({
      picked,
      notes,
      dueAt,
      staffId: env.staff.id,
      viaAssistant: true,
    });
    if (!created.ok) throw new StepRefused(created.message);
    return { summary: `${created.invoice.number} drafted`, href: `/invoices/${created.invoice.number}` };
  },
};
