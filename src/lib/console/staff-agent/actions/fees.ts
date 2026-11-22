import 'server-only';
import { db } from '@/lib/db';
import { BILLING, isRecurring } from '@/lib/console/fee-labels';
import { formatDate, formatMoney } from '@/lib/console/money';
import {
  checkFee,
  createFee,
  duplicateFeeMessage,
  renameFee as renameFeeRecord,
  type CheckedFee,
} from '@/lib/console/services/fees';
import { StepRefused } from './clients';
import { text, type PlanAction, type ProjectFacts } from './types';

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

export const addFee: PlanAction<{ project: ProjectFacts; fee: CheckedFee }> = {
  name: 'add_fee',
  label: 'Add fee',
  description:
    'Add one fee to a project. Fees are what proposals, agreements and invoices are built from. One step per fee. Use only amounts the person gave you: never work out, convert or estimate a price yourself.',
  permission: 'fees',
  properties: {
    project: { type: 'string', description: 'The project: "step:N" for one started earlier in this plan, or its reference such as UBU-2026-004.' },
    label: { type: 'string', description: 'The fee as the client will read it, unique on the project, such as "Website care" or "Phase 2 balance".' },
    billing_kind: {
      type: 'string',
      enum: ['one_off', 'installment', 'recurring_monthly', 'recurring_annual', 'usage'],
      description: 'one_off: paid once. installment: one part of a fee split into payments. recurring_monthly, recurring_annual: billed every month or year. usage: charged for what is used.',
    },
    amount: { type: 'string', description: 'The price in the project\'s currency, digits only, such as "150000".' },
    quantity: { type: 'integer', description: 'How many, if more than one.' },
    terms: { type: 'string', description: 'What it covers or when it is paid, as the client will read it.' },
    first_due: { type: 'string', description: 'YYYY-MM-DD. Required for monthly and yearly fees: when the first payment is due.' },
  },
  required: ['project', 'label', 'billing_kind', 'amount'],

  check: async (input, env) => {
    const project = await env.project(input.project);
    if (typeof project === 'string') return { ok: false, message: project };

    const checked = checkFee(
      {
        label: text(input.label),
        billingKind: text(input.billing_kind),
        amount: text(input.amount),
        quantity: text(input.quantity),
        terms: text(input.terms),
        nextDueAt: text(input.first_due),
      },
      project.currency,
    );
    if (!checked.ok) return { ok: false, message: checked.message };
    const { fee } = checked;
    if (fee.amountMinor === 0) {
      return { ok: false, message: 'A fee needs a price. Ask what it costs.' };
    }
    if (project.feeLabels.some((label) => sameName(label, fee.label))) {
      return { ok: false, message: duplicateFeeMessage(fee.label) };
    }
    // Counted from here on, so a later step in the same plan cannot repeat it.
    project.feeLabels.push(fee.label);

    return {
      ok: true,
      value: { project, fee },
      subject: fee.label,
      details: [
        `${formatMoney(fee.amountMinor, project.currency)}${fee.quantity > 1 ? ` × ${fee.quantity}` : ''}, ${BILLING[fee.billingKind].label.toLowerCase()}`,
        ...(isRecurring(fee.billingKind) && fee.nextDueAt ? [`First due ${formatDate(fee.nextDueAt)}`] : []),
        `On ${project.name}`,
        ...(fee.terms ? [fee.terms] : []),
      ],
    };
  },

  run: async ({ project, fee }, env) => {
    if (!project.id) throw new StepRefused('The project this fee belongs to was not started.');
    await createFee({
      project: { id: project.id, currency: project.currency },
      fee,
      staffId: env.staff.id,
      viaAssistant: true,
    });
    return { summary: `${fee.label} added`, href: `/projects/${project.slug}` };
  },
};

export const renameFee: PlanAction<{ feeId: string; from: string; to: string; project: ProjectFacts }> = {
  name: 'rename_fee',
  label: 'Rename fee',
  description:
    'Change the name of a fee already on a project, and nothing else about it. For a wrong price or date, tell the person to edit the fee on the project page.',
  permission: 'fees',
  properties: {
    project: { type: 'string', description: 'The project reference, such as UBU-2026-004.' },
    fee: { type: 'string', description: 'The fee\'s number in get_project\'s list, such as "3". Its exact name also works when only one fee has that name.' },
    new_label: { type: 'string', description: 'The new name.' },
  },
  required: ['project', 'fee', 'new_label'],

  check: async (input, env) => {
    const project = await env.project(input.project);
    if (typeof project === 'string') return { ok: false, message: project };
    if (!project.id) return { ok: false, message: 'That project does not exist yet, so it has no fee to rename.' };

    const fees = await db.lineItem.findMany({
      where: { projectId: project.id, status: { not: 'cancelled' } },
      orderBy: { position: 'asc' },
      select: { id: true, label: true },
    });
    const which = text(input.fee, 200);
    const byNumber = /^\d+$/.test(which) ? fees[Number(which) - 1] : undefined;
    const byName = fees.filter((fee) => sameName(fee.label, which));
    const fee = byNumber ?? (byName.length === 1 ? byName[0] : undefined);
    if (!fee) {
      return {
        ok: false,
        message:
          byName.length > 1
            ? `${byName.length} fees on ${project.name} are called ${which}. Give the fee's number from get_project instead.`
            : `${project.name} has no fee ${which}. Read the project with get_project and use the fee's number.`,
      };
    }

    const to = text(input.new_label, 160);
    if (to.length < 2) return { ok: false, message: 'Give the fee a name.' };
    if (fees.some((other) => other.id !== fee.id && sameName(other.label, to))) {
      return { ok: false, message: duplicateFeeMessage(to) };
    }
    return {
      ok: true,
      value: { feeId: fee.id, from: fee.label, to, project },
      subject: to,
      details: [`Was "${fee.label}"`, `On ${project.name}`],
    };
  },

  run: async ({ feeId, to, project }, env) => {
    const renamed = await renameFeeRecord({ feeId, label: to, staffId: env.staff.id });
    if (!renamed.ok) throw new StepRefused(renamed.message);
    return { summary: `Renamed to ${to}`, href: `/projects/${project.slug}` };
  },
};
