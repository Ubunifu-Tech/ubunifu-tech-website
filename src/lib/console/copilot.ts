import 'server-only';
import { isUniqueConflict } from './conflict';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { formatDate, formatMoney } from './money';
import { DOCUMENT_KIND_LABEL, currentTerms } from './documents';
import { getOrg } from './org';
import { liveDocument } from './live';
import { AGENT_MODEL, type AgentTool } from './agent';

/**
 * The drafting copilot's context and its one tool.
 *
 * It can write a version of the document it is attached to, and nothing else.
 * It cannot send, cannot price, cannot touch another project, and cannot reach
 * a document that has been signed. The tool list is the permission boundary and
 * it is decided here, on the server, from the conversation's own document id —
 * never from anything the conversation contains.
 */

export const COPILOT_SYSTEM = `You help Ubunifu Technologies, a software and design agency in Tanzania, write business documents: proposals, agreements, statements of work, change orders and handover packs.

You are a co-pilot. A member of staff is writing; you draft and revise on request, and they take responsibility for what is sent. You never send anything.

HOW YOU WORK
- When they ask you to write, draft, rewrite, shorten, expand or change the document, call save_draft with the COMPLETE document. Never a fragment and never a diff: the tool replaces the body, so a partial answer loses the rest.
- When they ask a question, are thinking aloud, or want an opinion, just answer. Do not call the tool.
- After saving, say in one or two sentences what you changed and what still needs them. Do not repeat the document back.

HOW TO WRITE
- Plain British English. Short sentences. Write as a careful person would speak, not as a legal template sounds.
- Never use em dashes or en dashes. Use a full stop, a comma, a colon or brackets instead.
- Never oversell. No words like amazing, exciting, seamless, cutting-edge or world-class. Say what the work is and what it does.
- Markdown only: ## and ### headings, paragraphs, - bullets, numbered lists, **bold**, > notes, tables for anything with columns. No code blocks and no HTML.
- Start at a ## heading. No document title as an H1, and no preamble about what you are about to produce.

HOW THE PAGE SHOWS IT
The document is laid out in the company's house style, and your markdown decides how it looks:
- Each ## heading is a numbered section (01, 02, 03). Never number headings yourself.
- ### is a sub-heading inside a section, in violet. Use it for named parts, such as "Receipt numbers" under "The receipt".
- A numbered list shows as a row per step. Use one for anything that happens in order, like how something works or the next steps.
- A line starting with > shows as a tinted note that stands apart. Use it for the one or two things a reader must not miss, such as what is not included or what the dates depend on. No more than one per section.
- A table has a dark header row and banded rows. Use one for anything with columns: a timeline (Week, Dates, What happens), who does what, options side by side.
- For a list of named items, lead each bullet with the name in bold and a colon: "- **Company details:** the name, address and TIN for the receipt."

THE USUAL SHAPE
Follow the shape for the kind of document, leaving out what the facts do not support and adding what the project needs:
- Proposal: Summary; How it will work (numbered steps) or The approach; What is included; Timeline (a table, when there are dates); Investment ({{fees}}); What we need from you (bold lead-ins, with the date needed by); Not included; After handover; Next steps (numbered, ending with confirming and paying the deposit when a deposit is recorded).
- Agreement or statement of work: Scope; Deliverables; Timeline; Investment ({{fees}}); What we need from you; How the work is accepted; Changes to the scope; Next steps.
- Change order: What changes; Why; Effect on the timeline; Investment ({{fees}}); Approval.
- Handover pack: What was delivered; Access and accounts; Looking after it; Support after handover; Who to contact.
When a signed or sent proposal is in the brief and you are writing the agreement, carry its scope, dates and exclusions across faithfully rather than inventing new ones.

STANDARD SECTIONS
Some sections are added to every document of a kind when it is sent, and the brief lists them under STANDARD SECTIONS. Never write those yourself, and do not contradict them.

FEES
- Never write prices, totals or a fee table yourself. The system builds the fee table from the project's fees when the document is sent, so the amounts the client signs always match what we invoice.
- In a proposal, agreement, statement of work or change order, put {{fees}} on a line of its own where the fee table belongs, usually under a "## Fees" or "## Investment" heading you do not repeat inside the table. If you leave it out, the table is added at the end.
- You may describe how payment works in words (for example "half at the start, half at handover") only when the fee terms you are given say so.

WHAT YOU MAY AND MAY NOT DO
- Use only the figures, dates, names and deliverables you are given. Never invent a price, a date, a deadline or a payment term.
- If something needed is missing, write it inline as [TO CONFIRM: what is missing]. Do not guess and do not quietly leave it out. The document cannot be sent while any remain.
- Never restate the standard terms of engagement. They are a separate, versioned document the client accepts alongside this one, and duplicating them creates two texts that can disagree.
- Never write clauses about liability, indemnity, insurance, governing law or dispute resolution. Those live in the standard terms and are not yours to draft.
- Do not address the client by a contact's personal name. The document is between two organisations.

You are producing a draft, not advice. A person decides what is sent.`;

/** Everything the model is allowed to know about this project, as plain text. */
export async function copilotBrief(documentId: string): Promise<string | null> {
  const document = await db.document.findUnique({
    where: { id: documentId, ...liveDocument },
    select: {
      kind: true,
      title: true,
      project: {
        select: {
          name: true,
          reference: true,
          serviceLine: true,
          engagementType: true,
          summary: true,
          currency: true,
          startDate: true,
          targetDate: true,
          client: { select: { name: true, legalName: true, country: true } },
          lineItems: {
            where: { status: { in: ['planned', 'active'] } },
            orderBy: { position: 'asc' },
            select: { label: true, terms: true, amountMinor: true, billingKind: true },
          },
          phases: {
            orderBy: { position: 'asc' },
            select: {
              name: true,
              goal: true,
              startDate: true,
              endDate: true,
              deliverables: { orderBy: { position: 'asc' }, select: { title: true } },
            },
          },
          assetRequests: {
            orderBy: { position: 'asc' },
            select: { title: true, detail: true, status: true },
          },
          owner: { select: { name: true, title: true } },
          enquiries: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { subject: true, message: true, createdAt: true },
          },
          documents: {
            where: { id: { not: documentId }, status: { not: 'draft' } },
            orderBy: { updatedAt: 'desc' },
            take: 3,
            select: {
              kind: true,
              title: true,
              reference: true,
              status: true,
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { bodyMarkdown: true },
              },
            },
          },
        },
      },
    },
  });

  if (!document) return null;

  const [org, terms, standard] = await Promise.all([
    getOrg(),
    currentTerms(),
    db.documentDefault.findUnique({ where: { kind: document.kind }, select: { bodyMarkdown: true } }),
  ]);
  const project = document.project;
  const money = (minor: number) => formatMoney(minor, project.currency);

  const lines = project.lineItems.length
    ? project.lineItems
        .map(
          (line) =>
            `- ${line.label}: ${money(line.amountMinor)} (${line.billingKind.replace(/_/g, ' ')})${
              line.terms ? `. Terms: ${line.terms}` : ''
            }`,
        )
        .join('\n')
    : '- No fee lines have been priced yet.';

  const phases = project.phases.length
    ? project.phases
        .map((phase) => {
          const dates =
            phase.startDate || phase.endDate
              ? ` (${phase.startDate ? formatDate(phase.startDate) : '?'} to ${
                  phase.endDate ? formatDate(phase.endDate) : '?'
                })`
              : '';
          return `- ${phase.name}${dates}${phase.goal ? `: ${phase.goal}` : ''}\n${phase.deliverables
            .map((deliverable) => `  · ${deliverable.title}`)
            .join('\n')}`;
        })
        .join('\n')
    : '- No plan has been laid out yet.';

  const assets = project.assetRequests.length
    ? project.assetRequests
        .map(
          (asset) =>
            `- ${asset.title}${asset.detail ? `: ${asset.detail}` : ''} (${
              asset.status === 'received' ? 'received' : asset.status === 'waived' ? 'not needed' : 'still to come'
            })`,
        )
        .join('\n')
    : '- Nothing recorded.';

  const enquiry = project.enquiries[0];
  const others = project.documents.length
    ? project.documents
        .map((other) => {
          const text = other.versions[0]?.bodyMarkdown ?? '';
          return `--- ${DOCUMENT_KIND_LABEL[other.kind]} ${other.reference}, "${other.title}", ${other.status.replace(/_/g, ' ')}\n${
            text.length > 8000 ? `${text.slice(0, 8000)}\n[shortened]` : text
          }`;
        })
        .join('\n\n')
    : 'None yet.';

  return `THE DOCUMENT
Kind: ${DOCUMENT_KIND_LABEL[document.kind]}
Title: ${document.title}

THE PARTIES
Supplier: ${org.legalName}, ${org.country}
Client: ${project.client.legalName ?? project.client.name}, ${project.client.country}

THE PROJECT
${project.name} (${project.reference})
Service line: ${project.serviceLine}
How it is billed: ${project.engagementType.replace(/_/g, ' ')}
Currency: ${project.currency}
Starts: ${project.startDate ? formatDate(project.startDate) : 'not set'}
Target: ${project.targetDate ? formatDate(project.targetDate) : 'not set'}
What the work is: ${project.summary ?? 'not written yet'}
Led at Ubunifu by: ${project.owner ? `${project.owner.name}${project.owner.title ? `, ${project.owner.title}` : ''}` : 'not set'}

HOW TO REACH US (for next steps; do not invent other channels)
Website: ${org.website ?? 'ubunifutech.com'}
Email: ${org.email}
${org.phone ? `WhatsApp: ${org.phone}` : 'WhatsApp: not recorded'}

WHERE THE WORK CAME FROM
${enquiry ? `Their enquiry, ${formatDate(enquiry.createdAt)}: "${enquiry.subject}"\n${enquiry.message.slice(0, 3000)}` : 'No enquiry on record.'}

FEES AS RECORDED
${lines}

THE PLAN AS RECORDED
${phases}

WHAT WE NEED FROM THE CLIENT
${assets}

OTHER DOCUMENTS ON THIS PROJECT (latest version of each)
${others}

STANDARD SECTIONS (added automatically when this is sent; do NOT write them)
${standard?.bodyMarkdown.trim() || 'None set for this kind of document.'}

STANDARD TERMS
${
  terms
    ? `${terms.title}, version ${terms.version}. Accepted separately at signing. Do NOT restate them.`
    : 'None published yet.'
}`;
}

export type CopilotContext = {
  documentId: string;
  staffId: string;
};

/**
 * The only thing the copilot can do to the world.
 *
 * It writes a new version, which is exactly what a staff member does when they
 * press save — same table, same versioning, same rules. A signed document is
 * refused here as well as in the UI, because a tool call is not a button press
 * and must not be trusted to have come from one.
 */
export const saveDraftTool: AgentTool<CopilotContext> = {
  name: 'save_draft',
  description:
    'Save a new version of this document. Pass the COMPLETE document body, not a fragment: it replaces what is there. Use this whenever the person asks you to write, rewrite, shorten, expand or change the document.',
  inputSchema: {
    type: 'object',
    properties: {
      markdown: {
        type: 'string',
        description:
          'The complete document in markdown: ## headings, paragraphs, - bullets, numbered lists, **bold**, and tables where there are columns.',
      },
      change_note: {
        type: 'string',
        description:
          'A short line for the version history saying what changed, e.g. "Split the payment into two stages".',
      },
    },
    required: ['markdown', 'change_note'],
  },
  run: async (input, context) => {
    const { markdown, change_note: changeNote } =
      (input ?? {}) as { markdown?: unknown; change_note?: unknown };

    if (typeof markdown !== 'string' || markdown.trim().length < 40) {
      return { result: 'That is too short to be a document. Write the whole thing.', done: false };
    }
    if (markdown.length > 200_000) {
      return { result: 'That is too long to save. Make it shorter.', done: false };
    }

    const document = await db.document.findUnique({
      where: { id: context.documentId, ...liveDocument },
      select: {
        id: true,
        status: true,
        versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true } },
      },
    });

    if (!document) return { result: 'That document no longer exists.', done: false };
    if (document.status === 'signed') {
      return {
        result:
          'This document has been signed and cannot be changed. Tell them a change order is the way to alter a signed agreement.',
        done: false,
      };
    }

    const version = (document.versions[0]?.version ?? 0) + 1;

    try {
    await db.documentVersion.create({
      data: {
        documentId: document.id,
        version,
        bodyMarkdown: markdown.trim(),
        changeNote: typeof changeNote === 'string' && changeNote.trim()
          ? changeNote.trim().slice(0, 200)
          : 'Drafted by the assistant',
        aiAssisted: true,
        aiModel: AGENT_MODEL,
        createdById: context.staffId,
      },
    });
    } catch (error) {
      if (isUniqueConflict(error)) {
        return {
          result: 'Someone saved a version at the same moment. Tell them to reload, then ask again.',
          done: false,
        };
      }
      throw error;
    }

    const markers = (markdown.match(/\[TO CONFIRM/g) ?? []).length;

    return {
      result:
        `Saved as version ${version}.` +
        (markers > 0
          ? ` It contains ${markers} TO CONFIRM marker${markers === 1 ? '' : 's'}; the document cannot be sent until those are filled in.`
          : ''),
      meta: { version, markers } satisfies Prisma.InputJsonValue,
    };
  },
};
