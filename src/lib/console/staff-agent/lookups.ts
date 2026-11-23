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
      result: `${project.reference}: ${project.name}
For ${project.client.name} (page /clients/${project.client.slug}). Page: /projects/${project.slug}
Stage: ${STAFF_LABEL[project.status]}. Currency: ${project.currency}. Led by ${project.owner?.name ?? 'nobody yet'}.
Starts ${project.startDate ? formatDate(project.startDate) : 'not set'}, target ${project.targetDate ? formatDate(project.targetDate) : 'not set'}.
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

export const LOOKUPS = [findRecords, getClient, getProject];
