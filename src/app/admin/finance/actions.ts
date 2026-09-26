'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { CostCategory } from '@/generated/prisma/client';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { isCurrency } from '@/lib/console/currencies';
import { formText } from '@/lib/console/form';
import { formatMoney, parseDateInput, parseMoney } from '@/lib/console/money';
import { monthDate, monthLabel, ratePair } from '@/lib/console/finance';
import { recordCostBill } from '@/lib/console/cost-bills';

export type FinanceState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  field?: string;
  /** The cost just added, so its bill can be attached straight away. */
  costId?: string;
};

const CATEGORIES = Object.values(CostCategory) as string[];

function refresh() {
  revalidatePath('/admin/finance', 'layout');
}

/** A client and project a cost is for, checked to exist and to belong together. */
async function readFor(formData: FormData) {
  const clientId = formText(formData, 'clientId') || null;
  const projectId = formText(formData, 'projectId') || null;
  if (projectId) {
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, clientId: true },
    });
    if (!project) return { ok: false as const, message: 'That project no longer exists.' };
    if (clientId && clientId !== project.clientId) {
      return { ok: false as const, message: 'That project belongs to another client.' };
    }
    return { ok: true as const, clientId: project.clientId, projectId: project.id };
  }
  if (clientId) {
    const client = await db.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    });
    if (!client) return { ok: false as const, message: 'That client no longer exists.' };
  }
  return { ok: true as const, clientId, projectId: null };
}

/** The parts every cost and regular cost share. */
function readCost(formData: FormData, amountField: string) {
  const vendor = formText(formData, 'vendor').slice(0, 120);
  const category = formText(formData, 'category');
  const currency = formText(formData, 'currency');
  const description = formText(formData, 'description').slice(0, 500) || null;
  if (vendor.length < 2) return { ok: false as const, message: 'Say who it was paid to.', field: 'vendor' };
  if (!CATEGORIES.includes(category)) {
    return { ok: false as const, message: 'Choose what it was for.', field: 'category' };
  }
  if (!isCurrency(currency)) {
    return { ok: false as const, message: 'Choose a currency.', field: 'currency' };
  }
  const amountMinor = parseMoney(formText(formData, amountField), currency);
  if (amountMinor === null || amountMinor <= 0) {
    return { ok: false as const, message: 'Enter the amount on the bill.', field: amountField };
  }
  return {
    ok: true as const,
    vendor,
    category: category as CostCategory,
    currency,
    description,
    amountMinor,
  };
}

/**
 * Records a cost, or changes one. Ticking "every month" also keeps it as a
 * regular cost, so next month it is waiting to be confirmed.
 */
export async function saveCost(_previous: FinanceState, formData: FormData): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const read = readCost(formData, 'amount');
  if (!read.ok) return { status: 'error', message: read.message, field: read.field };
  const incurredOn = parseDateInput(formText(formData, 'incurredOn'));
  if (!incurredOn) return { status: 'error', message: 'Choose the date on the bill.', field: 'incurredOn' };
  if (incurredOn.getTime() > Date.now() + 31 * 86_400_000) {
    return { status: 'error', message: 'That date is more than a month away.', field: 'incurredOn' };
  }
  const forWhat = await readFor(formData);
  if (!forWhat.ok) return { status: 'error', message: forWhat.message, field: 'projectId' };

  const costId = formText(formData, 'costId');
  let regularId = formText(formData, 'regularId') || null;
  if (regularId) {
    const regular = await db.regularCost.findUnique({ where: { id: regularId }, select: { id: true } });
    if (!regular) regularId = null;
  }

  const data = {
    incurredOn,
    vendor: read.vendor,
    category: read.category,
    description: read.description,
    amountMinor: read.amountMinor,
    currency: read.currency,
    clientId: forWhat.clientId,
    projectId: forWhat.projectId,
  };

  if (costId) {
    const changed = await db.cost.updateMany({ where: { id: costId }, data });
    if (changed.count === 0) return { status: 'error', message: 'That cost no longer exists.' };
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'cost.changed',
      entityType: 'Cost',
      entityId: costId,
      summary: `${read.vendor}, ${formatMoney(read.amountMinor, read.currency)}`,
    });
    refresh();
    return { status: 'done', message: 'Saved.' };
  }

  if (!regularId && formData.get('everyMonth') === 'on') {
    const regular = await db.regularCost.create({
      data: {
        vendor: read.vendor,
        category: read.category,
        description: read.description,
        usualMinor: read.amountMinor,
        currency: read.currency,
        clientId: forWhat.clientId,
        projectId: forWhat.projectId,
      },
      select: { id: true },
    });
    regularId = regular.id;
  }

  const cost = await db.cost.create({
    data: { ...data, regularId, recordedById: staff.id },
    select: { id: true },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'cost.recorded',
    entityType: 'Cost',
    entityId: cost.id,
    summary: `${read.vendor}, ${formatMoney(read.amountMinor, read.currency)}`,
  });
  refresh();
  return { status: 'done', message: `${read.vendor} added.`, costId: cost.id };
}

/** Takes out a cost typed in by mistake. The record says who and what it was. */
export async function removeCost(_previous: FinanceState, formData: FormData): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const cost = await db.cost.findUnique({
    where: { id: formText(formData, 'costId') },
    select: { id: true, vendor: true, amountMinor: true, currency: true, incurredOn: true },
  });
  if (!cost) return { status: 'error', message: 'That cost no longer exists.' };

  await db.cost.delete({ where: { id: cost.id } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'cost.removed',
    entityType: 'Cost',
    entityId: cost.id,
    summary: `${cost.vendor}, ${formatMoney(cost.amountMinor, cost.currency)} on ${cost.incurredOn
      .toISOString()
      .slice(0, 10)}`,
  });
  refresh();
  return { status: 'done', message: 'Removed.' };
}

/** A regular cost's usual amount and details, or a new one. */
export async function saveRegularCost(
  _previous: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const read = readCost(formData, 'usual');
  if (!read.ok) return { status: 'error', message: read.message, field: read.field };
  const forWhat = await readFor(formData);
  if (!forWhat.ok) return { status: 'error', message: forWhat.message, field: 'projectId' };

  const data = {
    vendor: read.vendor,
    category: read.category,
    description: read.description,
    usualMinor: read.amountMinor,
    currency: read.currency,
    clientId: forWhat.clientId,
    projectId: forWhat.projectId,
  };
  const regularId = formText(formData, 'regularId');
  const saved = regularId
    ? await db.regularCost.update({ where: { id: regularId }, data, select: { id: true } }).catch(() => null)
    : await db.regularCost.create({ data, select: { id: true } });
  if (!saved) return { status: 'error', message: 'That regular cost no longer exists.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'regular_cost.saved',
    entityType: 'RegularCost',
    entityId: saved.id,
    summary: `${read.vendor}, usually ${formatMoney(read.amountMinor, read.currency)}`,
  });
  refresh();
  return { status: 'done', message: 'Saved.' };
}

/** Stops a regular cost being asked for each month, or starts it again. */
export async function setRegularCostActive(
  _previous: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const isActive = formText(formData, 'active') === 'on';
  const regular = await db.regularCost
    .update({
      where: { id: formText(formData, 'regularId') },
      data: { isActive },
      select: { id: true, vendor: true },
    })
    .catch(() => null);
  if (!regular) return { status: 'error', message: 'That regular cost no longer exists.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: isActive ? 'regular_cost.restarted' : 'regular_cost.stopped',
    entityType: 'RegularCost',
    entityId: regular.id,
    summary: regular.vendor,
  });
  refresh();
  return { status: 'done', message: isActive ? 'Started again.' : 'Stopped.' };
}

/**
 * The rate for a month, as "1 of the base buys this many of the quote",
 * which is how it is asked for on the page.
 */
export async function saveExchangeRate(
  _previous: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const month = formText(formData, 'month');
  const base = formText(formData, 'base');
  const quote = formText(formData, 'quote');
  if (!/^\d{4}-\d{2}$/.test(month) || !isCurrency(base) || !isCurrency(quote) || base === quote) {
    return { status: 'error', message: 'That rate does not look right.' };
  }
  // Always stored the one way round, whichever way it was asked.
  const pair = ratePair(base, quote);
  const typed = formText(formData, 'rate').replace(/,/g, '');
  const value = Number(typed);
  if (!/^\d+(\.\d+)?$/.test(typed) || !Number.isFinite(value) || value <= 0 || value > 1e9) {
    return { status: 'error', message: 'Enter the rate as a number, like 2450.', field: 'rate' };
  }
  const rate = pair.base === base ? value : 1 / value;

  await db.exchangeRate.upsert({
    where: { month_base_quote: { month: monthDate(month), base: pair.base, quote: pair.quote } },
    create: {
      month: monthDate(month),
      base: pair.base,
      quote: pair.quote,
      rate: rate.toFixed(8),
      updatedById: staff.id,
    },
    update: { rate: rate.toFixed(8), updatedById: staff.id },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'exchange_rate.saved',
    entityType: 'ExchangeRate',
    entityId: `${month}:${pair.base}:${pair.quote}`,
    summary: `${monthLabel(month)}: 1 ${pair.base} = ${Number(rate.toFixed(8))} ${pair.quote}`,
  });
  refresh();
  return { status: 'done', message: 'Saved.' };
}

/** Confirms a bill the browser has just sent to the store. */
export async function attachBill(
  costId: string,
  blobUrl: string,
  filename: string,
): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  try {
    await recordCostBill({ blobUrl, costId, staffId: staff.id, filename });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'bill-wrong-type') {
      return { status: 'error', message: 'Attach the bill as a PDF or a photo.' };
    }
    if (reason === 'bill-too-large') {
      return { status: 'error', message: 'That file is larger than 10 MB.' };
    }
    if (reason === 'cost-gone') return { status: 'error', message: 'That cost no longer exists.' };
    console.error('[costs] could not record the bill', error);
    return { status: 'error', message: 'That did not arrive. Try it again?' };
  }
  refresh();
  return { status: 'done', message: 'Bill attached.' };
}

/** Takes a bill off a cost. The file is kept, marked, as uploads always are. */
export async function removeBill(_previous: FinanceState, formData: FormData): Promise<FinanceState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const costId = formText(formData, 'costId');
  const cost = await db.cost.findUnique({ where: { id: costId }, select: { id: true, vendor: true } });
  if (!cost) return { status: 'error', message: 'That cost no longer exists.' };

  const removed = await db.fileUpload.updateMany({
    where: { costId: cost.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (removed.count === 0) return { status: 'error', message: 'There is no bill on it.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'cost.bill_removed',
    entityType: 'Cost',
    entityId: cost.id,
    summary: cost.vendor,
  });
  refresh();
  return { status: 'done', message: 'Bill removed.' };
}
