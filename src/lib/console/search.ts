import 'server-only';
import { db } from '@/lib/db';
import { can, type StaffActor } from './auth';
import { liveDocument, liveEnquiry, liveInvoice, livePayment, liveTicket } from './live';

export type SearchHit = {
  type: string;
  name: string;
  href: string;
  client: { name: string; href: string } | null;
  /** The record's number or reference, where it has one. */
  reference: string | null;
};

const PER_TYPE = 5;
const REFERENCE = /^[A-Z]{2,5}-\d{4}-\d{2,}$/;

/**
 * Where an exact number or reference lives, when the search is one: INV-,
 * RCP-, RFN-, a project's or a document's reference, a request's. Only among
 * what this person may open.
 */
export async function exactRecord(staff: StaffActor, query: string): Promise<string | null> {
  const ref = query.trim().toUpperCase();
  if (!REFERENCE.test(ref)) return null;
  const money = can(staff, 'invoices');

  const [invoice, receipt, refund, project, document, ticket] = await Promise.all([
    money ? db.invoice.findFirst({ where: { number: ref, ...liveInvoice }, select: { number: true } }) : null,
    money ? db.receipt.findFirst({ where: { number: ref, payment: livePayment }, select: { number: true } }) : null,
    money
      ? db.refund.findFirst({ where: { number: ref, payment: livePayment }, select: { number: true } })
      : null,
    db.project.findFirst({ where: { reference: ref, deletedAt: null }, select: { slug: true } }),
    can(staff, 'documents')
      ? db.document.findFirst({ where: { reference: ref, ...liveDocument }, select: { reference: true } })
      : null,
    db.ticket.findFirst({ where: { reference: ref, ...liveTicket }, select: { reference: true } }),
  ]);

  if (invoice) return `/invoices/${invoice.number}`;
  if (receipt) return `/receipts/${receipt.number}`;
  if (refund) return `/refunds/${refund.number}`;
  if (project) return `/projects/${project.slug}`;
  if (document) return `/documents/${document.reference}`;
  if (ticket) return `/requests/${ticket.reference}`;
  return null;
}

/**
 * Everything matching a name, an email, a number or a reference, a few of
 * each kind, each kind only for those whose role can open it.
 */
export async function searchConsole(staff: StaffActor, query: string): Promise<SearchHit[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const like = { contains: text, mode: 'insensitive' as const };
  const clientOf = (client: { name: string; slug: string }) => ({ name: client.name, href: `/clients/${client.slug}` });

  const [clients, contacts, projects, enquiries, invoices, payments, documents, tickets, posts] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null, OR: [{ name: like }, { legalName: like }] },
      orderBy: { name: 'asc' },
      take: PER_TYPE,
      select: { name: true, slug: true },
    }),
    db.clientContact.findMany({
      where: { deletedAt: null, client: { deletedAt: null }, OR: [{ name: like }, { email: like }, { phone: like }] },
      orderBy: { name: 'asc' },
      take: PER_TYPE,
      select: { name: true, client: { select: { name: true, slug: true } } },
    }),
    db.project.findMany({
      where: { deletedAt: null, OR: [{ name: like }, { reference: like }] },
      orderBy: { createdAt: 'desc' },
      take: PER_TYPE,
      select: { name: true, slug: true, reference: true, client: { select: { name: true, slug: true } } },
    }),
    can(staff, 'enquiries')
      ? db.enquiry.findMany({
          where: { ...liveEnquiry, OR: [{ name: like }, { email: like }, { subject: like }] },
          orderBy: { createdAt: 'desc' },
          take: PER_TYPE,
          select: { id: true, name: true, subject: true },
        })
      : [],
    can(staff, 'invoices')
      ? db.invoice.findMany({
          where: { ...liveInvoice, OR: [{ number: like }, { client: { name: like } }] },
          orderBy: { createdAt: 'desc' },
          take: PER_TYPE,
          select: { number: true, client: { select: { name: true, slug: true } } },
        })
      : [],
    can(staff, 'invoices')
      ? db.payment.findMany({
          where: { ...livePayment, OR: [{ reference: like }, { receipt: { number: like } }] },
          orderBy: { receivedAt: 'desc' },
          take: PER_TYPE,
          select: {
            reference: true,
            receipt: { select: { number: true } },
            invoice: { select: { number: true, client: { select: { name: true, slug: true } } } },
          },
        })
      : [],
    can(staff, 'documents')
      ? db.document.findMany({
          where: { ...liveDocument, OR: [{ reference: like }, { title: like }] },
          orderBy: { createdAt: 'desc' },
          take: PER_TYPE,
          select: {
            reference: true,
            title: true,
            project: { select: { client: { select: { name: true, slug: true } } } },
          },
        })
      : [],
    db.ticket.findMany({
      where: { ...liveTicket, OR: [{ reference: like }, { subject: like }] },
      orderBy: { createdAt: 'desc' },
      take: PER_TYPE,
      select: { reference: true, subject: true, client: { select: { name: true, slug: true } } },
    }),
    can(staff, 'journal')
      ? db.post.findMany({
          where: { deletedAt: null, title: like },
          orderBy: { createdAt: 'desc' },
          take: PER_TYPE,
          select: { id: true, title: true },
        })
      : [],
  ]);

  return [
    ...clients.map((row) => ({ type: 'Client', name: row.name, href: `/clients/${row.slug}`, client: null, reference: null })),
    ...contacts.map((row) => ({
      type: 'Person',
      name: row.name,
      href: `/clients/${row.client.slug}`,
      client: clientOf(row.client),
      reference: null,
    })),
    ...projects.map((row) => ({
      type: 'Project',
      name: row.name,
      href: `/projects/${row.slug}`,
      client: clientOf(row.client),
      reference: row.reference,
    })),
    ...enquiries.map((row) => ({
      type: 'Enquiry',
      name: `${row.name}: ${row.subject}`,
      href: `/enquiries/${row.id}`,
      client: null,
      reference: null,
    })),
    ...invoices.map((row) => ({
      type: 'Invoice',
      name: row.number,
      href: `/invoices/${row.number}`,
      client: clientOf(row.client),
      reference: row.number,
    })),
    ...payments.flatMap((row) =>
      row.receipt
        ? [
            {
              type: 'Payment',
              name: row.reference ?? row.receipt.number,
              href: `/receipts/${row.receipt.number}`,
              client: clientOf(row.invoice.client),
              reference: row.receipt.number,
            },
          ]
        : [],
    ),
    ...documents.map((row) => ({
      type: 'Document',
      name: row.title,
      href: `/documents/${row.reference}`,
      client: clientOf(row.project.client),
      reference: row.reference,
    })),
    ...tickets.map((row) => ({
      type: 'Request',
      name: row.subject,
      href: `/requests/${row.reference}`,
      client: clientOf(row.client),
      reference: row.reference,
    })),
    ...posts.map((row) => ({ type: 'Post', name: row.title, href: `/posts/${row.id}`, client: null, reference: null })),
  ];
}
