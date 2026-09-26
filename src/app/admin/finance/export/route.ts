import { can, getStaffActor } from '@/lib/console/auth';
import { COST_CATEGORY_LABEL } from '@/lib/console/cost-labels';
import { ledger, periodFor } from '@/lib/console/finance';
import { moneyInput, toDateInputValue } from '@/lib/console/money';
import { SERVICE_LABEL } from '@/lib/console/project-status';

const KIND: Record<string, string> = {
  received: 'Payment received',
  refunded: 'Refund sent',
  cost: 'Cost',
  invoiced: 'Invoice issued',
};

/** A value for a CSV cell: quoted when it has to be, quotes doubled. */
const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * The period's money as a spreadsheet, for an accountant or a tax return:
 * every payment, refund, cost and invoice, each in the currency it was in.
 * Reached as /finance/export on the console host.
 */
export async function GET(request: Request): Promise<Response> {
  const staff = await getStaffActor();
  if (!staff) return new Response(null, { status: 404 });
  if (!can(staff, 'finance')) return new Response('Your role does not include the reports.', { status: 403 });

  const period = periodFor(new URL(request.url).searchParams.get('period') ?? undefined, new Date());
  const lines = await ledger(period);

  const rows = [
    ['Date', 'Type', 'Reference', 'Client', 'Project', 'Service', 'Spent on', 'Currency', 'Amount', 'VAT'],
    ...lines.map((line) => [
      toDateInputValue(line.on),
      KIND[line.kind] ?? line.kind,
      line.reference,
      line.client ? `${line.client.name}${line.client.removed ? ' (removed)' : ''}` : '',
      line.project?.name ?? '',
      line.project ? (SERVICE_LABEL[line.project.serviceLine] ?? line.project.serviceLine) : '',
      line.category ? (COST_CATEGORY_LABEL[line.category] ?? line.category) : '',
      line.currency,
      `${line.kind === 'refunded' || line.kind === 'cost' ? '-' : ''}${moneyInput(line.amountMinor, line.currency)}`,
      line.taxMinor ? moneyInput(line.taxMinor, line.currency) : '',
    ]),
  ];
  const csv = rows.map((row) => row.map(cell).join(',')).join('\r\n');

  return new Response(`﻿${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ubunifu-money-${period.key}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
