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
import { statusesIn } from '@/lib/console/stages';
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
    }
  | {
      /**
       * A view Copilot put together for one question: a title and a few
       * blocks from a fixed set. Records in it are filled in here, from the
       * records. Its own text, figures and rows are Copilot's, and the view
       * says so, with the records it read listed beside it to check against.
       */
      kind: 'view';
      title: string;
      blocks: ViewBlock[];
    };

export type ViewBlock =
  | { type: 'text'; text: string }
  | { type: 'stats'; items: { label: string; value: string; note?: string }[] }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][]; numeric?: boolean }
  | { type: 'record'; card: Extract<Card, { kind: 'record' }> };

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
  const finished: string[] = [...statusesIn('delivered'), 'closed', 'cancelled'];
  const open = client.projects.filter((project) => !finished.includes(project.status)).length;
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

const cell = (value: unknown, max = 160) =>
  (typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * A view as Copilot asked for it, checked and cut to size. Anything that is
 * not one of the known blocks is dropped, not guessed at, and a record block
 * is replaced by the record's own card, read as the person asking.
 */
export async function composeView(
  staff: StaffActor,
  input: { title?: unknown; blocks?: unknown },
): Promise<{ card: Extract<Card, { kind: 'view' }>; said: string } | { refused: string }> {
  const title = cell(input.title, 90);
  if (title.length < 3) return { refused: 'Give the view a short title saying what it shows.' };
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) return { refused: 'A view needs at least one block.' };
  if (input.blocks.length > 8) return { refused: 'A view holds at most eight blocks. Show less, or make two views.' };

  const blocks: ViewBlock[] = [];
  for (const [index, raw] of input.blocks.entries()) {
    const block = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const where = `Block ${index + 1}`;
    if (block.type === 'text') {
      const text = typeof block.text === 'string' ? block.text.trim().slice(0, 1500) : '';
      if (!text) return { refused: `${where}: a text block needs its text.` };
      blocks.push({ type: 'text', text });
    } else if (block.type === 'stats') {
      const items = (Array.isArray(block.items) ? block.items : [])
        .slice(0, 6)
        .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : {}))
        .map((item) => ({ label: cell(item.label, 40), value: cell(item.value, 40), ...(cell(item.note, 80) ? { note: cell(item.note, 80) } : {}) }))
        .filter((item) => item.label && item.value);
      if (items.length === 0) return { refused: `${where}: a stats block needs items, each with a label and a value.` };
      blocks.push({ type: 'stats', items });
    } else if (block.type === 'table') {
      const columns = (Array.isArray(block.columns) ? block.columns : []).slice(0, 6).map((column) => cell(column, 40)).filter(Boolean);
      const rows = (Array.isArray(block.rows) ? block.rows : [])
        .slice(0, 40)
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => columns.map((_, at) => cell(row[at])));
      if (columns.length < 2 || rows.length === 0) return { refused: `${where}: a table needs at least two columns and one row.` };
      blocks.push({ type: 'table', ...(cell(block.title, 80) ? { title: cell(block.title, 80) } : {}), columns, rows, numeric: block.numeric === true });
    } else if (block.type === 'record') {
      const shown = await showRecord(staff, cell(block.record, 200), 'summary');
      if ('refused' in shown) return { refused: `${where}: ${shown.refused}` };
      if (shown.card.kind !== 'record') return { refused: `${where}: that is not one record.` };
      blocks.push({ type: 'record', card: shown.card });
    } else {
      return { refused: `${where}: the blocks are text, stats, table and record.` };
    }
  }
  return {
    card: { kind: 'view', title, blocks },
    said: `Shown as a view: "${title}", ${blocks.length} block${blocks.length === 1 ? '' : 's'}.`,
  };
}

export const REPORTS = ['invoices_owing', 'open_projects', 'documents_in_play'] as const;
export type Report = (typeof REPORTS)[number];

/**
 * A list across the whole console, as a table: what is owed, what is being
 * worked on, which documents are not yet signed. Read as the person asking,
 * and given back both as rows for them and as text for Copilot to reason on.
 */
export async function report(staff: StaffActor, which: Report): Promise<{ card: Card; text: string } | { refused: string }> {
  const now = new Date();
  if (which === 'invoices_owing') {
    if (!can(staff, 'invoices')) return { refused: "This person's role does not include invoices." };
    const invoices = numbers(
      await db.invoice.findMany({
        where: { ...liveInvoice, status: { in: ['draft', 'sent', 'part_paid', 'overdue'] } },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 40,
        select: { number: true, status: true, currency: true, totalMinor: true, paidMinor: true, dueAt: true, client: { select: { name: true } } },
      }),
    );
    const rows = invoices.map((invoice) => [
      invoice.number,
      invoice.client.name,
      INVOICE_STATUS_LABEL[invoiceStanding(invoice, now)] ?? invoice.status,
      invoice.dueAt ? formatShortDate(invoice.dueAt) : 'On receipt',
      formatMoney(Math.max(0, invoice.totalMinor - invoice.paidMinor), invoice.currency),
    ]);
    return {
      card: { kind: 'table', title: 'Invoices not yet settled', columns: ['Number', 'Client', 'State', 'Due', 'Unpaid'], rows, numeric: true, note: 'Every invoice is settled.', href: '/invoices' },
      text: rows.map((row) => `- ${row.join(', ')}`).join('\n') || 'Every invoice is settled.',
    };
  }
  if (which === 'open_projects') {
    const projects = await db.project.findMany({
      where: { deletedAt: null, status: { notIn: [...statusesIn('delivered'), 'closed', 'cancelled'] } },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
      take: 40,
      select: { reference: true, name: true, status: true, targetDate: true, client: { select: { name: true } }, owner: { select: { name: true } } },
    });
    const rows = projects.map((project) => [
      project.reference,
      project.name,
      project.client.name,
      STAFF_LABEL[project.status],
      project.owner?.name ?? 'Nobody yet',
      project.targetDate ? formatShortDate(project.targetDate) : 'Not set',
    ]);
    return {
      card: { kind: 'table', title: 'Open projects', columns: ['Ref', 'Project', 'Client', 'Stage', 'Led by', 'Target'], rows, note: 'No open projects.', href: '/projects' },
      text: rows.map((row) => `- ${row.join(', ')}`).join('\n') || 'No open projects.',
    };
  }
  if (!can(staff, 'documents')) return { refused: "This person's role does not include documents." };
  const documents = await db.document.findMany({
    where: { ...liveDocument, status: { notIn: ['signed', 'declined'] } },
    orderBy: { updatedAt: 'desc' },
    take: 40,
    select: { reference: true, title: true, kind: true, status: true, updatedAt: true, project: { select: { client: { select: { name: true } } } } },
  });
  const rows = documents.map((document) => [
    document.reference,
    document.title,
    document.project.client.name,
    DOCUMENT_STATUS_LABEL[document.status] ?? document.status,
    formatShortDate(document.updatedAt),
  ]);
  return {
    card: { kind: 'table', title: 'Documents not yet signed', columns: ['Number', 'Document', 'Client', 'State', 'Last touched'], rows, note: 'Nothing is waiting.', href: '/documents' },
    text: rows.map((row) => `- ${row.join(', ')}`).join('\n') || 'Nothing is waiting.',
  };
}
