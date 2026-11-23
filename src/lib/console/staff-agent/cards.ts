import 'server-only';
import { db } from '@/lib/db';
import { can, type StaffActor } from '@/lib/console/auth';
import { billableLines } from '@/lib/console/billing';
import { INVOICE_STATUS_LABEL, invoiceStanding } from '@/lib/console/billing-labels';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { BILLING, FEE_STATUS_LABEL } from '@/lib/console/fee-labels';
import { liveDocument, liveInvoice } from '@/lib/console/live';
import { formatMoney, formatShortDate, numbers } from '@/lib/console/money';
import { STAFF_LABEL } from '@/lib/console/project-status';
import { billableName } from '@/lib/console/services/invoices';

/**
 * What Copilot can put in front of a person in place of a paragraph: a record
 * as a card, or a few rows as a table.
 *
 * The catalogue is fixed and every value is read here, from the record, as
 * the person asking. Copilot only says which record and which view. It never
 * writes a figure, a status or a link into a card, so a card cannot say
 * something the record does not.
 */

export type Tone = 'good' | 'warn' | 'bad' | 'live' | 'neutral';

export type Card =
  | {
      kind: 'record';
      type: 'Client' | 'Project' | 'Document' | 'Invoice';
      title: string;
      subtitle?: string;
      badge?: { label: string; tone: Tone };
      /** At most five, the ones a person asks about first. */
      facts: { label: string; value: string }[];
      href: string;
      /** At most two: the next thing a person would do, as a place to do it. */
      actions: { label: string; href: string }[];
    }
  | {
      kind: 'table';
      title: string;
      columns: string[];
      /** One array of cells per row; the last column is right-aligned when `numeric`. */
      rows: string[][];
      numeric?: boolean;
      note?: string;
      href?: string;
    };

/** A record Copilot read, shown under its reply so the person can see what it went on. */
export type ReadRef = { type: string; label: string; href: string };

export const VIEWS = ['summary', 'fees', 'billable', 'invoices', 'documents'] as const;
export type View = (typeof VIEWS)[number];

type Shown = { card: Card; said: string } | { refused: string };

const DOCUMENT_REF = /^(PRO|AGR|CHG|SOW|HND|DOC)-\d{4}-\d{3,}$/i;
const INVOICE_REF = /^INV-\d{4}-\d{3,}$/i;

/** Where a console path points, when it is one record's own page. */
export function recordOnPage(page: string | null): { type: 'project' | 'client' | 'document' | 'invoice'; ref: string } | null {
  const match = /^\/(projects|clients|documents|invoices)\/([A-Za-z0-9_-]{1,120})$/.exec(page ?? '');
  if (!match || match[2] === 'new') return null;
  const type = { projects: 'project', clients: 'client', documents: 'document', invoices: 'invoice' }[match[1]!] as
    | 'project'
    | 'client'
    | 'document'
    | 'invoice';
  return { type, ref: match[2]! };
}

export async function showRecord(staff: StaffActor, record: string, view: View): Promise<Shown> {
  const ref = record.trim().replace(/^\/(projects|clients|documents|invoices)\//, '').slice(0, 200);
  if (!ref) return { refused: 'Say which record: a reference such as UBU-2026-004, INV-2026-007 or AGR-2026-003, or a client name.' };
  if (INVOICE_REF.test(ref)) return invoiceCard(staff, ref.toUpperCase());
  if (DOCUMENT_REF.test(ref)) return documentCard(staff, ref.toUpperCase());

  const project = await db.project.findFirst({
    where: {
      deletedAt: null,
      OR: [{ reference: ref.toUpperCase() }, { slug: ref.toLowerCase() }, { name: { equals: ref, mode: 'insensitive' } }],
    },
    select: { id: true },
  });
  if (project) return projectCard(staff, project.id, view);

  const client = await db.client.findFirst({
    where: { deletedAt: null, OR: [{ slug: ref.toLowerCase() }, { name: { equals: ref, mode: 'insensitive' } }] },
    select: { id: true },
  });
  if (client) return clientCard(client.id);
  return { refused: `Nothing is called "${ref}". Find it with find_records and use its reference.` };
}

async function clientCard(id: string): Promise<Shown> {
  const client = await db.client.findUniqueOrThrow({
    where: { id },
    select: {
      name: true,
      slug: true,
      country: true,
      currency: true,
      contacts: {
        where: { deletedAt: null, isPrimary: true },
        take: 1,
        select: { name: true, email: true, activatedAt: true, canSignIn: true },
      },
      projects: { where: { deletedAt: null }, select: { status: true } },
    },
  });
  const contact = client.contacts[0];
  const open = client.projects.filter((project) => !['complete', 'cancelled'].includes(project.status)).length;
  return {
    said: `Shown as a card: ${client.name}.`,
    card: {
      kind: 'record',
      type: 'Client',
      title: client.name,
      subtitle: `${client.country}, billed in ${client.currency}`,
      facts: [
        { label: 'Main contact', value: contact ? contact.name : 'Nobody yet' },
        ...(contact ? [{ label: 'Email', value: contact.email ?? 'None yet' }] : []),
        ...(contact
          ? [{ label: 'Portal', value: !contact.canSignIn ? 'Access off' : contact.activatedAt ? 'Set up' : 'Not set up yet' }]
          : []),
        { label: 'Projects', value: `${client.projects.length}${open ? `, ${open} open` : ''}` },
      ],
      href: `/clients/${client.slug}`,
      actions: contact ? [] : [{ label: 'Add their main contact', href: `/clients/${client.slug}` }],
    },
  };
}

async function projectCard(staff: StaffActor, id: string, view: View): Promise<Shown> {
  const seesFees = can(staff, 'fees') || can(staff, 'invoices');
  const project = numbers(
    await db.project.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        reference: true,
        status: true,
        currency: true,
        targetDate: true,
        owner: { select: { name: true } },
        client: { select: { name: true } },
        lineItems: {
          where: { status: { not: 'cancelled' } },
          orderBy: { position: 'asc' },
          select: { label: true, amountMinor: true, quantity: true, billingKind: true, status: true },
        },
        documents: {
          where: liveDocument,
          orderBy: { createdAt: 'asc' },
          select: { reference: true, title: true, kind: true, status: true },
        },
        invoices: {
          where: liveInvoice,
          orderBy: { createdAt: 'asc' },
          select: { number: true, status: true, totalMinor: true, paidMinor: true, dueAt: true, currency: true },
        },
        phases: { select: { deliverables: { select: { completedAt: true } } } },
      },
    }),
  );
  const href = `/projects/${project.slug}`;
  const money = (minor: number) => formatMoney(minor, project.currency);

  if (view === 'fees') {
    if (!seesFees) return { refused: "This person's role does not include fees." };
    return {
      said: `Shown as a table: the ${project.lineItems.length} fees on ${project.name}.`,
      card: {
        kind: 'table',
        title: `Fees on ${project.name}`,
        columns: ['Fee', 'Billed', 'Status', 'Price'],
        rows: project.lineItems.map((line) => [
          line.label,
          BILLING[line.billingKind].label,
          FEE_STATUS_LABEL[line.status],
          line.amountMinor > 0 ? money(line.amountMinor * line.quantity) : 'Not priced',
        ]),
        numeric: true,
        href: `${href}?tab=fees`,
      },
    };
  }
  if (view === 'billable') {
    if (!can(staff, 'invoices')) return { refused: "This person's role does not include invoices." };
    const lines = await billableLines(project.id);
    return {
      said: lines.length ? `Shown as a table: ${lines.length} things that can be invoiced now on ${project.name}.` : `Nothing on ${project.name} can be invoiced right now. Say so; no table was shown.`,
      card: {
        kind: 'table',
        title: `Can be invoiced now on ${project.name}`,
        columns: ['Item', 'Due', 'Amount'],
        rows: lines.map((line) => [
          billableName(line),
          line.dueAt ? formatShortDate(line.dueAt) : 'On agreement',
          line.usage ? 'By usage' : formatMoney(line.amountMinor, line.currency),
        ]),
        numeric: true,
        note: lines.length ? undefined : 'Nothing to invoice right now.',
        href: `${href}?tab=fees`,
      },
    };
  }
  if (view === 'invoices') {
    if (!can(staff, 'invoices')) return { refused: "This person's role does not include invoices." };
    return {
      said: `Shown as a table: the ${project.invoices.length} invoices on ${project.name}.`,
      card: {
        kind: 'table',
        title: `Invoices on ${project.name}`,
        columns: ['Number', 'Status', 'Due', 'Unpaid'],
        rows: project.invoices.map((invoice) => [
          invoice.number,
          INVOICE_STATUS_LABEL[invoiceStanding(invoice, new Date())] ?? invoice.status,
          invoice.dueAt ? formatShortDate(invoice.dueAt) : 'On receipt',
          formatMoney(Math.max(0, invoice.totalMinor - invoice.paidMinor), invoice.currency),
        ]),
        numeric: true,
        note: project.invoices.length ? undefined : 'No invoices yet.',
        href: `${href}?tab=fees`,
      },
    };
  }
  if (view === 'documents') {
    if (!can(staff, 'documents')) return { refused: "This person's role does not include documents." };
    return {
      said: `Shown as a table: the ${project.documents.length} documents on ${project.name}.`,
      card: {
        kind: 'table',
        title: `Documents on ${project.name}`,
        columns: ['Number', 'Document', 'Kind', 'State'],
        rows: project.documents.map((document) => [
          document.reference,
          document.title,
          DOCUMENT_KIND_LABEL[document.kind],
          DOCUMENT_STATUS_LABEL[document.status] ?? document.status,
        ]),
        note: project.documents.length ? undefined : 'No documents yet.',
        href: `${href}?tab=documents`,
      },
    };
  }

  const tasks = project.phases.flatMap((phase) => phase.deliverables);
  const done = tasks.filter((task) => task.completedAt).length;
  const unpaid = project.invoices
    .filter((invoice) => ['sent', 'part_paid', 'overdue'].includes(invoice.status))
    .reduce((total, invoice) => total + Math.max(0, invoice.totalMinor - invoice.paidMinor), 0);
  const agreed = project.lineItems
    .filter((line) => ['planned', 'active'].includes(line.status))
    .reduce((total, line) => total + line.amountMinor * line.quantity, 0);
  return {
    said: `Shown as a card: ${project.reference}, ${project.name}.`,
    card: {
      kind: 'record',
      type: 'Project',
      title: project.name,
      subtitle: `${project.reference} for ${project.client.name}`,
      badge: { label: STAFF_LABEL[project.status], tone: 'live' },
      facts: [
        { label: 'Led by', value: project.owner?.name ?? 'Nobody yet' },
        { label: 'Tasks', value: tasks.length ? `${done} of ${tasks.length} done` : 'None yet' },
        { label: 'Target', value: project.targetDate ? formatShortDate(project.targetDate) : 'Not set' },
        ...(seesFees ? [{ label: 'Fees agreed', value: money(agreed) }] : []),
        ...(can(staff, 'invoices') ? [{ label: 'Unpaid', value: money(unpaid) }] : []),
      ],
      href,
      actions: [],
    },
  };
}

async function documentCard(staff: StaffActor, reference: string): Promise<Shown> {
  if (!can(staff, 'documents')) return { refused: "This person's role does not include documents." };
  const document = await db.document.findFirst({
    where: { reference, ...liveDocument },
    select: {
      reference: true,
      title: true,
      kind: true,
      status: true,
      project: { select: { name: true, client: { select: { name: true } } } },
      versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true, createdAt: true } },
      signatureRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { sentAt: true, viewedAt: true, expiresAt: true },
      },
    },
  });
  if (!document) return { refused: `There is no document ${reference}.` };
  const request = document.signatureRequests[0];
  const href = `/documents/${document.reference}`;
  const draft = document.status === 'draft' || document.status === 'internal_review';
  return {
    said: `Shown as a card: ${document.reference}, "${document.title}".`,
    card: {
      kind: 'record',
      type: 'Document',
      title: document.title,
      subtitle: `${DOCUMENT_KIND_LABEL[document.kind]} ${document.reference} for ${document.project.client.name}`,
      badge: {
        label: DOCUMENT_STATUS_LABEL[document.status] ?? document.status,
        tone: document.status === 'signed' ? 'good' : document.status === 'declined' ? 'bad' : draft ? 'neutral' : 'live',
      },
      facts: [
        { label: 'Project', value: document.project.name },
        { label: 'Version', value: document.versions[0] ? `${document.versions[0].version}, ${formatShortDate(document.versions[0].createdAt)}` : 'Not written yet' },
        ...(request?.sentAt ? [{ label: 'Sent', value: formatShortDate(request.sentAt) }] : []),
        ...(request?.sentAt ? [{ label: 'Opened', value: request.viewedAt ? formatShortDate(request.viewedAt) : 'Not yet' }] : []),
        ...(request?.expiresAt && document.status !== 'signed' ? [{ label: 'Signing closes', value: formatShortDate(request.expiresAt) }] : []),
      ],
      href,
      // Sending is a person's step, so the card takes them to where it is done.
      actions: draft
        ? [
            { label: 'Edit', href: `${href}?step=write` },
            { label: 'Review and send', href: `${href}?step=review` },
          ]
        : document.status === 'signed'
          ? []
          : [{ label: 'Open the Send step', href: `${href}?step=send` }],
    },
  };
}

async function invoiceCard(staff: StaffActor, number: string): Promise<Shown> {
  if (!can(staff, 'invoices')) return { refused: "This person's role does not include invoices." };
  const invoice = numbers(
    await db.invoice.findFirst({
      where: { number, ...liveInvoice },
      select: {
        number: true,
        status: true,
        currency: true,
        totalMinor: true,
        paidMinor: true,
        dueAt: true,
        issuedAt: true,
        client: { select: { name: true } },
        project: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
  );
  if (!invoice) return { refused: `There is no invoice ${number}.` };
  const standing = invoiceStanding(invoice, new Date());
  const unpaid = Math.max(0, invoice.totalMinor - invoice.paidMinor);
  const href = `/invoices/${invoice.number}`;
  return {
    said: `Shown as a card: ${invoice.number}.`,
    card: {
      kind: 'record',
      type: 'Invoice',
      title: invoice.number,
      subtitle: `For ${invoice.client.name}${invoice.project ? `, ${invoice.project.name}` : ''}`,
      badge: {
        label: INVOICE_STATUS_LABEL[standing] ?? standing,
        tone: standing === 'paid' ? 'good' : standing === 'overdue' ? 'bad' : standing === 'part_paid' ? 'warn' : standing === 'sent' ? 'live' : 'neutral',
      },
      facts: [
        { label: 'Total', value: `${formatMoney(invoice.totalMinor, invoice.currency)}, ${invoice._count.lines} ${invoice._count.lines === 1 ? 'line' : 'lines'}` },
        { label: 'Unpaid', value: formatMoney(unpaid, invoice.currency) },
        { label: 'Issued', value: invoice.issuedAt ? formatShortDate(invoice.issuedAt) : 'Not yet' },
        { label: 'Due', value: invoice.dueAt ? formatShortDate(invoice.dueAt) : 'On receipt' },
      ],
      href,
      actions:
        invoice.status === 'draft'
          ? [{ label: 'Open to send', href }]
          : unpaid > 0 && invoice.status !== 'void'
            ? [{ label: 'Record a payment', href: `/payments/new?invoice=${invoice.number}` }]
            : [],
    },
  };
}
