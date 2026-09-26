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
  income: 'Other income',
};

/** A value for a CSV cell: quoted when it has to be, quotes doubled. */
const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * Text someone typed, made safe to open in a spreadsheet. A name starting
 * with = + - or @ would otherwise be run as a formula when the file is
 * opened, so it gets a leading apostrophe, which spreadsheets show as text.
 */
const text = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

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
    [
      'Date',
      'Type',
      'Reference',
      'Client',
      'Project',
      'Product',
      'Service',
      'Spent on',
      'Currency',
      'Amount',
      'VAT',
    ],
    ...lines.map((line) => [
      toDateInputValue(line.on),
      KIND[line.kind] ?? line.kind,
      text(line.reference),
      text(line.client ? `${line.client.name}${line.client.removed ? ' (removed)' : ''}` : ''),
      text(line.project?.name ?? ''),
      text(line.product?.name ?? ''),
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
