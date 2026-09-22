import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type { InvoiceSheetData } from '@/components/documents/InvoiceSheet';

/** What the invoice sheet reads, and nothing else. */
export const INVOICE_SHEET_SELECT = {
  number: true,
  status: true,
  currency: true,
  subtotalMinor: true,
  taxMinor: true,
  totalMinor: true,
  paidMinor: true,
  notes: true,
  issuedAt: true,
  dueAt: true,
  client: {
    select: {
      name: true,
      legalName: true,
      country: true,
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
    orderBy: { receivedAt: 'asc' },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      receivedAt: true,
      receipt: { select: { number: true } },
    },
  },
} satisfies Prisma.InvoiceSelect;

type Row = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_SHEET_SELECT }>;

export function toSheet(invoice: Row): InvoiceSheetData {
  return {
    ...invoice,
    client: {
      name: invoice.client.name,
      legalName: invoice.client.legalName,
      country: invoice.client.country,
    },
    attention: invoice.client.contacts[0]?.name ?? null,
  };
}
