import 'server-only';
import { db } from '@/lib/db';
import type { AgentTool } from '@/lib/console/agent';
import { can, type StaffActor } from '@/lib/console/auth';
import { billableLines } from '@/lib/console/billing';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { BILLING, FEE_STATUS_LABEL, isRecurring } from '@/lib/console/fee-labels';
import { liveDocument, liveInvoice } from '@/lib/console/live';
import { formatDate, formatMoney, numbers } from '@/lib/console/money';
import { STAFF_LABEL } from '@/lib/console/project-status';
import { searchConsole } from '@/lib/console/search';
import { billableName } from '@/lib/console/services/invoices';
import { INVOICE_STATUS_LABEL, invoiceStanding } from '@/lib/console/billing-labels';
import { DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { toConfirmCount } from '@/lib/console/to-confirm';
import { showRecord, VIEWS, type ReadRef, type View } from './cards';

/**
 * What the console assistant can read. Each lookup runs as the person asking
 * and shows what their role shows them on the matching page, no more: money
 * needs the invoices permission, fees need fees or invoices, documents need
 * documents. Lookups change nothing.
 */

export type StaffContext = { staff: StaffActor; conversationId: string };

const wanted = (input: unknown, key: string) => {
  const value = (input as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value.trim().slice(0, 200) : '';
};

export const findRecords: AgentTool<StaffContext> = {
  name: 'find_records',
  description:
    'Search the console by name, reference or email: clients, their people, projects, documents, invoices, requests and enquiries. Use it before adding anything, to see whether it already exists, and to get the exact name or reference of a record.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'A name, part of one, a reference such as UBU-2026-004, or an email.' },
    },
    required: ['query'],
  },
  run: async (input, { staff }) => {
    const query = wanted(input, 'query');
    if (query.length < 2) return { result: 'Give at least two characters to search for.', done: false };
    const hits = await searchConsole(staff, query);
    if (hits.length === 0) return { result: `Nothing in the console matches "${query}".` };
    return {
      result: hits
        .slice(0, 20)
        .map(
          (hit) =>
            `- ${hit.type}: ${hit.name}${hit.reference ? ` (${hit.reference})` : ''}${
              hit.client ? `, client ${hit.client.name}` : ''
            }, page ${hit.href}`,
        )
        .join('\n'),
    };
  },
};

export const getClient: AgentTool<StaffContext> = {
  name: 'get_client',
  description:
    'Read one client: their details, their people and whether each has a portal account, and their projects.',
  inputSchema: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'The exact name, or the last part of its page address from find_records.' },
    },
    required: ['client'],
  },
  run: async (input) => {
    const name = wanted(input, 'client').replace(/^\/clients\//, '');
    const client = await db.client.findFirst({
      where: {
        deletedAt: null,
        OR: [{ slug: name.toLowerCase() }, { name: { equals: name, mode: 'insensitive' } }],
      },
      select: {
        name: true,
        slug: true,
        legalName: true,
        country: true,
        currency: true,
        website: true,
        contacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: { name: true, role: true, email: true, phone: true, isPrimary: true, activatedAt: true, canSignIn: true },
        },
        projects: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { name: true, reference: true, status: true, slug: true },
        },
      },
    });
    if (!client) return { result: `There is no client "${name}". Search with find_records.`, done: false };

    const people = client.contacts.map(
      (contact) =>
        `- ${contact.name}${contact.role ? `, ${contact.role}` : ''}${contact.isPrimary ? ' (main contact)' : ''}: ${
          contact.email ?? 'no email yet'
        }${contact.phone ? `, ${contact.phone}` : ''}. Portal: ${
          !contact.canSignIn ? 'access off' : contact.activatedAt ? 'account set up' : 'not set up yet'
        }`,
    );
    const projects = client.projects.map(
      (project) => `- ${project.reference}: ${project.name}, ${STAFF_LABEL[project.status]}, page /projects/${project.slug}`,
    );
    return {
      meta: { read: { type: 'Client', label: client.name, href: `/clients/${client.slug}` } satisfies ReadRef },
      result: `${client.name}${client.legalName ? ` (registered as ${client.legalName})` : ''}
Page: /clients/${client.slug}
Country ${client.country}, billed in ${client.currency}${client.website ? `, ${client.website}` : ''}

PEOPLE
${people.join('\n') || '- Nobody recorded.'}

PROJECTS
${projects.join('\n') || '- None yet.'}`,
    };
  },
};

export const getProject: AgentTool<StaffContext> = {
  name: 'get_project',
  description:
    'Read one project: where it stands, its fees (numbered), what can be invoiced now (numbered), its documents and its invoices. Shows only what the person\'s role shows them.',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Its reference, such as UBU-2026-004, or exact name.' },
    },
    required: ['project'],
  },
  run: async (input, { staff }) => {
    const name = wanted(input, 'project').replace(/^\/projects\//, '');
    const seesFees = can(staff, 'fees') || can(staff, 'invoices');
    const project = numbers(
      await db.project.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { reference: name.toUpperCase() },
            { slug: name.toLowerCase() },
            { name: { equals: name, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          reference: true,
          status: true,
          currency: true,
          summary: true,
          startDate: true,
          targetDate: true,
          vercelProjectId: true,
          vercelProjectName: true,
          hostingPausedAt: true,
          owner: { select: { name: true } },
          client: { select: { name: true, slug: true } },
          lineItems: {
            where: { status: { not: 'cancelled' } },
            orderBy: { position: 'asc' },
            select: { label: true, amountMinor: true, quantity: true, billingKind: true, status: true, nextDueAt: true, terms: true },
          },
          documents: {
            where: liveDocument,
            orderBy: { createdAt: 'asc' },
            select: { reference: true, kind: true, title: true, status: true },
          },
          invoices: {
            where: liveInvoice,
            orderBy: { createdAt: 'asc' },
            select: { number: true, status: true, totalMinor: true, paidMinor: true, dueAt: true, currency: true },
          },
        },
      }),
    );
    if (!project) return { result: `There is no project "${name}". Search with find_records.`, done: false };

    const money = (minor: number) => formatMoney(minor, project.currency);
    const fees = !seesFees
      ? "Not shown: this person's role does not include fees."
      : project.lineItems
          .map(
            (line, index) =>
              `${index + 1}. ${line.label}: ${money(line.amountMinor * line.quantity)}, ${BILLING[line.billingKind].label.toLowerCase()}, ${FEE_STATUS_LABEL[line.status].toLowerCase()}${
                isRecurring(line.billingKind) && line.nextDueAt ? `, next due ${formatDate(line.nextDueAt)}` : ''
              }${line.terms ? `. ${line.terms}` : ''}`,
          )
          .join('\n') || 'None yet.';

    let billable = "Not shown: this person's role does not include invoices.";
    let invoices = billable;
    if (can(staff, 'invoices')) {
      const lines = await billableLines(project.id);
      billable =
        lines
          .map(
            (line, index) =>
              `${index + 1}. ${billableName(line)}: ${
                line.usage
                  ? "charged by usage, this time's amount comes from the person"
                  : formatMoney(line.amountMinor, line.currency)
              }${line.dueAt ? `, due ${formatDate(line.dueAt)}` : ''}`,
          )
          .join('\n') || 'Nothing to invoice right now. A yearly or monthly fee appears here close to its date.';
      invoices =
        project.invoices
          .map(
            (invoice) =>
              `- ${invoice.number}: ${invoice.status.replace(/_/g, ' ')}, ${formatMoney(invoice.totalMinor, invoice.currency)}, paid ${formatMoney(invoice.paidMinor, invoice.currency)}${
                invoice.dueAt ? `, due ${formatDate(invoice.dueAt)}` : ''
              }, page /invoices/${invoice.number}`,
          )
          .join('\n') || 'None yet.';
    }

    const documents = !can(staff, 'documents')
      ? "Not shown: this person's role does not include documents."
      : project.documents
          .map(
            (document) =>
              `- ${document.reference}: ${DOCUMENT_KIND_LABEL[document.kind]}, "${document.title}", ${document.status.replace(/_/g, ' ')}, page /documents/${document.reference}`,
          )
          .join('\n') || 'None yet.';

    return {
      meta: { read: { type: 'Project', label: project.reference, href: `/projects/${project.slug}` } satisfies ReadRef },
      result: `${project.reference}: ${project.name}
For ${project.client.name} (page /clients/${project.client.slug}). Page: /projects/${project.slug}
Stage: ${STAFF_LABEL[project.status]}. Currency: ${project.currency}. Led by ${project.owner?.name ?? 'nobody yet'}.
Starts ${project.startDate ? formatDate(project.startDate) : 'not set'}, target ${project.targetDate ? formatDate(project.targetDate) : 'not set'}.
Hosting: ${
        !project.vercelProjectId
          ? 'no Vercel project linked'
          : `${project.vercelProjectName ?? project.vercelProjectId} on Vercel, ${
              project.hostingPausedAt ? `paused since ${formatDate(project.hostingPausedAt)}` : 'serving'
            }`
      }.
${project.summary ? `About: ${project.summary}\n` : ''}
FEES
${fees}

CAN BE INVOICED NOW (numbered for create_invoice; by hand it is the project page, Money section)
${billable}

DOCUMENTS
${documents}

INVOICES
${invoices}`,
    };
  },
};

/** How much of a document is read out. A long agreement is cut, and says so. */
const DOCUMENT_CHARACTERS = 24_000;

export const getDocument: AgentTool<StaffContext> = {
  name: 'get_document',
  description:
    'Read one proposal or agreement: where it stands, who it went to, and its text as last saved. Use it to answer questions about what a document says, or before drafting something that should match it.',
  inputSchema: {
    type: 'object',
    properties: {
      document: { type: 'string', description: 'Its reference, such as AGR-2026-003.' },
    },
    required: ['document'],
  },
  run: async (input, { staff }) => {
    if (!can(staff, 'documents')) {
      return { result: "This person's role does not include documents, so it cannot be read out to them.", done: false };
    }
    const reference = wanted(input, 'document').replace(/^\/documents\//, '').toUpperCase();
    const document = await db.document.findFirst({
      where: { reference, ...liveDocument },
      select: {
        reference: true,
        title: true,
        kind: true,
        status: true,
        project: { select: { name: true, reference: true, slug: true, client: { select: { name: true } } } },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true, bodyMarkdown: true, sourceMarkdown: true, changeNote: true, createdAt: true },
        },
        signatureRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { sentAt: true, viewedAt: true, expiresAt: true, respondedAt: true, responseNote: true },
        },
        _count: { select: { versions: true } },
      },
    });
    if (!document) return { result: `There is no document "${reference}". Search with find_records.`, done: false };

    const latest = document.versions[0];
    const request = document.signatureRequests[0];
    const text = latest ? (latest.sourceMarkdown ?? latest.bodyMarkdown).trim() : '';
    const markers = toConfirmCount(text);
    const cut = text.length > DOCUMENT_CHARACTERS;
    return {
      meta: { read: { type: 'Document', label: document.reference, href: `/documents/${document.reference}` } satisfies ReadRef },
      result: `${document.reference}: "${document.title}"
${DOCUMENT_KIND_LABEL[document.kind]} for ${document.project.client.name}, project ${document.project.reference} (${document.project.name}). Page: /documents/${document.reference}
State: ${DOCUMENT_STATUS_LABEL[document.status] ?? document.status}. ${document._count.versions} version${document._count.versions === 1 ? '' : 's'}.${
        request?.sentAt
          ? ` Sent ${formatDate(request.sentAt)}, ${request.viewedAt ? `opened ${formatDate(request.viewedAt)}` : 'not opened yet'}${
              request.expiresAt ? `, signing closes ${formatDate(request.expiresAt)}` : ''
            }.`
          : ' Not sent.'
      }${request?.responseNote ? `\nThe client said: ${request.responseNote}` : ''}${
        markers > 0 ? `\n${markers} detail${markers === 1 ? ' is' : 's are'} still marked TO CONFIRM.` : ''
      }
Sending, withdrawing and editing it are done by a person on its page.

THE TEXT${latest ? ` (version ${latest.version}, saved ${formatDate(latest.createdAt)})` : ''}${cut ? `, first ${DOCUMENT_CHARACTERS.toLocaleString('en-GB')} characters` : ''}
${text ? text.slice(0, DOCUMENT_CHARACTERS) : 'Nothing has been written yet.'}`,
    };
  },
};

export const getInvoice: AgentTool<StaffContext> = {
  name: 'get_invoice',
  description: 'Read one invoice: its lines, what has been paid, when it is due and whether the client was sent it.',
  inputSchema: {
    type: 'object',
    properties: {
      invoice: { type: 'string', description: 'Its number, such as INV-2026-007.' },
    },
    required: ['invoice'],
  },
  run: async (input, { staff }) => {
    if (!can(staff, 'invoices')) {
      return { result: "This person's role does not include invoices, so it cannot be read out to them.", done: false };
    }
    const number = wanted(input, 'invoice').replace(/^\/invoices\//, '').toUpperCase();
    const invoice = numbers(
      await db.invoice.findFirst({
        where: { number, ...liveInvoice },
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalMinor: true,
          paidMinor: true,
          taxMinor: true,
          dueAt: true,
          issuedAt: true,
          notes: true,
          client: { select: { name: true } },
          project: { select: { name: true, reference: true } },
          lines: { orderBy: { position: 'asc' }, select: { label: true, amountMinor: true, quantity: true } },
          payments: {
            where: { reversedAt: null },
            orderBy: { receivedAt: 'asc' },
            select: { amountMinor: true, receivedAt: true, method: true, receipt: { select: { number: true } } },
          },
          overdueNotices: { orderBy: { givenAt: 'asc' }, select: { givenAt: true, channel: true } },
        },
      }),
    );
    if (!invoice) return { result: `There is no invoice "${number}". Search with find_records.`, done: false };
    const emailed = await db.emailLog.count({ where: { entityId: invoice.id, template: 'invoice_sent', status: 'sent' } });
    const money = (minor: number) => formatMoney(minor, invoice.currency);
    const standing = invoiceStanding(invoice, new Date());
    return {
      meta: { read: { type: 'Invoice', label: invoice.number, href: `/invoices/${invoice.number}` } satisfies ReadRef },
      result: `${invoice.number} for ${invoice.client.name}${invoice.project ? `, project ${invoice.project.reference} (${invoice.project.name})` : ''}. Page: /invoices/${invoice.number}
State: ${INVOICE_STATUS_LABEL[standing] ?? standing}. Issued ${invoice.issuedAt ? formatDate(invoice.issuedAt) : 'not yet, it is a draft'}. Due ${invoice.dueAt ? formatDate(invoice.dueAt) : 'on receipt'}. ${emailed > 0 ? 'Emailed to the client.' : 'Never emailed to the client.'}
Total ${money(invoice.totalMinor)}${invoice.taxMinor > 0 ? `, including ${money(invoice.taxMinor)} VAT` : ''}. Paid ${money(invoice.paidMinor)}. Unpaid ${money(Math.max(0, invoice.totalMinor - invoice.paidMinor))}.
${invoice.notes ? `Note on it: ${invoice.notes}\n` : ''}
LINES
${invoice.lines.map((line) => `- ${line.label}: ${money(line.amountMinor * line.quantity)}`).join('\n')}

PAYMENTS
${invoice.payments.map((payment) => `- ${money(payment.amountMinor)} on ${formatDate(payment.receivedAt)}, ${payment.method.replace(/_/g, ' ')}${payment.receipt ? `, receipt ${payment.receipt.number}` : ''}`).join('\n') || 'None recorded.'}
${invoice.overdueNotices.length ? `\nOVERDUE NOTICES\n${invoice.overdueNotices.map((notice) => `- given ${formatDate(notice.givenAt)} by ${notice.channel.replace(/_/g, ' ')}`).join('\n')}\n` : ''}
Sending it, recording a payment and changing its date are done by a person on its page.`,
    };
  },
};

/**
 * Puts a record, or a few of its rows, in front of the person as a card. The
 * card is written from the record, never from what Copilot says about it.
 */
export const show: AgentTool<StaffContext> = {
  name: 'show',
  description:
    'Put a record in front of the person as a card, or some of its rows as a table, in place of describing it in words. Use it when they ask to see something, when a list of fees, invoices or documents answers the question, and after a plan is carried out to show what was made. The card is filled in from the record, so say only a sentence about it yourself and never repeat its figures. Up to three in one reply.',
  inputSchema: {
    type: 'object',
    properties: {
      record: {
        type: 'string',
        description: 'A project reference (UBU-2026-004), a document reference (AGR-2026-003), an invoice number (INV-2026-007), or a client name exactly as find_records gave it.',
      },
      view: {
        type: 'string',
        enum: [...VIEWS],
        description: 'For a project only. summary: the project as a card. fees, billable (what can be invoiced now), invoices, documents: those rows as a table. Leave out for a summary.',
      },
    },
    required: ['record'],
  },
  run: async (input, { staff }) => {
    const view = wanted(input, 'view');
    const shown = await showRecord(staff, wanted(input, 'record'), (VIEWS as readonly string[]).includes(view) ? (view as View) : 'summary');
    if ('refused' in shown) return { result: shown.refused, done: false };
    return { result: `${shown.said} The person can see it now. Do not repeat what is on it.`, meta: { card: shown.card } };
  },
};

export const LOOKUPS = [findRecords, getClient, getProject, getDocument, getInvoice, show];

/**
 * The record on the page the person is looking at, read out the same way a
 * lookup would read it, so Copilot starts from what is on their screen and
 * does not have to be told or go and find it. Nothing when the page is not
 * one record's own, or their role does not show it to them.
 */
export async function pageRecord(
  staff: StaffActor,
  on: { type: 'project' | 'client' | 'document' | 'invoice'; ref: string } | null,
): Promise<{ label: string; text: string } | null> {
  if (!on) return null;
  const context = { staff, conversationId: '' };
  const read =
    on.type === 'project'
      ? await getProject.run({ project: on.ref }, context)
      : on.type === 'client'
        ? await getClient.run({ client: on.ref }, context)
        : on.type === 'document'
          ? await getDocument.run({ document: on.ref }, context)
          : await getInvoice.run({ invoice: on.ref }, context);
  if (read.done === false) return null;
  const label = (read.meta as { read?: ReadRef } | undefined)?.read?.label ?? on.ref;
  return { label, text: read.result };
}
