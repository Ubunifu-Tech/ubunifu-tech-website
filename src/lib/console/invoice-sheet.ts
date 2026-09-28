import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type { InvoiceSheetData } from '@/components/documents/InvoiceSheet';
import { numbers, type Numbers } from './money';

/** What the invoice sheet reads, and nothing else. */
export const INVOICE_SHEET_SELECT = {
  number: true,
  status: true,
  currency: true,
  subtotalMinor: true,
  taxMinor: true,
  totalMinor: true,
  paidMinor: true,
  refundedMinor: true,
  notes: true,
  issuedAt: true,
  dueAt: true,
  voidedAt: true,
  client: {
    select: {
      name: true,
      legalName: true,
      contacts: {
        where: { deletedAt: null, isPrimary: true },
        take: 1,
        select: { name: true },
      },
    },
  },
  project: { select: { name: true } },
  lines: {
    orderBy: { position: 'asc' },
    select: { id: true, label: true, description: true, amountMinor: true, quantity: true },
  },
  payments: {
    // The invoice lists money received. A reversed payment was not, so it is
    // left off here, as it is left out of paidMinor.
    where: { reversedAt: null },
    orderBy: { receivedAt: 'asc' },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      receivedAt: true,
      receipt: { select: { number: true } },
      // Money sent back against it. A cancelled refund sent nothing, so it
      // is left off, as it is left out of refundedMinor.
      refunds: {
        where: { cancelledAt: null },
        orderBy: { refundedAt: 'asc' },
        select: { id: true, number: true, amountMinor: true, currency: true, refundedAt: true },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

type Row = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_SHEET_SELECT }>;

/** A row as read, or already with its amounts as numbers. */
export function toSheet(row: Row | Numbers<Row>): InvoiceSheetData {
  const invoice = numbers(row);
  return {
    ...invoice,
    client: {
      name: invoice.client.name,
      legalName: invoice.client.legalName,
    },
    attention: invoice.client.contacts[0]?.name ?? null,
  };
}
