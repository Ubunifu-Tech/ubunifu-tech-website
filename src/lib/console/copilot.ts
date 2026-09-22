import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { formatDate, formatMoney } from './money';
import { DOCUMENT_KIND_LABEL, currentTerms } from './documents';
import { getOrg } from './org';
import type { AgentTool } from './agent';

/**
 * The drafting copilot's context and its one tool.
 *
 * It can write a version of the document it is attached to, and nothing else.
 * It cannot send, cannot price, cannot touch another project, and cannot reach
 * a document that has been signed. The tool list is the permission boundary and
 * it is decided here, on the server, from the conversation's own document id —
 * never from anything the conversation contains.
 */

export const COPILOT_SYSTEM = `You help Ubunifu Technologies, a software and design agency in Tanzania, write business documents — proposals, agreements, statements of work, change orders and handover packs.

You are a co-pilot. A member of staff is writing; you draft and revise on request, and they take responsibility for what is sent. You never send anything.

HOW YOU WORK
- When they ask you to write, draft, rewrite, shorten, expand or change the document, call save_draft with the COMPLETE document. Never a fragment and never a diff — the tool replaces the body, so a partial answer loses the rest.
- When they ask a question, are thinking aloud, or want an opinion, just answer. Do not call the tool.
- After saving, say in one or two sentences what you changed and what still needs them. Do not repeat the document back.

HOW TO WRITE
- Plain British English. Short sentences. Write as a careful person would speak, not as a legal template sounds.
- Markdown only: ## and ### headings, paragraphs, - bullets, numbered lists, **bold**, tables for anything with columns. No code blocks and no HTML.
- Start at a ## heading. No document title as an H1, and no preamble about what you are about to produce.

WHAT YOU MAY AND MAY NOT DO
- Use only the figures, dates, names and deliverables you are given. Never invent a price, a date, a deadline or a payment term.
- If something needed is missing, write it inline as [TO CONFIRM: what is missing]. Do not guess and do not quietly leave it out. Staff search for those markers before sending, and the system refuses to send while any remain.
- Never restate the standard terms of engagement. They are a separate, versioned document the client accepts alongside this one, and duplicating them creates two texts that can disagree.
- Never write clauses about liability, indemnity, insurance, governing law or dispute resolution. Those live in the standard terms and are not yours to draft.
- Do not address the client by a contact's personal name. The document is between two organisations.

You are producing a draft, not advice. A person decides what is sent.`;

/** Everything the model is allowed to know about this project, as plain text. */
export async function copilotBrief(documentId: string): Promise<string | null> {
  const document = await db.document.findUnique({
    where: { id: documentId },
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
              deliverables: { orderBy: { position: 'asc' }, select: { title: true } },
            },
          },
          assetRequests: { orderBy: { position: 'asc' }, select: { title: true, detail: true } },
        },
      },
    },
  });

  if (!document) return null;

  const [org, terms] = await Promise.all([getOrg(), currentTerms()]);
  const project = document.project;
  const money = (minor: number) => formatMoney(minor, project.currency);

  const lines = project.lineItems.length
    ? project.lineItems
        .map(
          (line) =>
            `- ${line.label} — ${money(line.amountMinor)} (${line.billingKind.replace(/_/g, ' ')})${
              line.terms ? `. Terms: ${line.terms}` : ''
            }`,
        )
        .join('\n')
    : '- No fee lines have been priced yet.';

  const phases = project.phases.length
    ? project.phases
        .map(
          (phase) =>
            `- ${phase.name}${phase.goal ? `: ${phase.goal}` : ''}\n${phase.deliverables
              .map((deliverable) => `  · ${deliverable.title}`)
              .join('\n')}`,
        )
        .join('\n')
    : '- No plan has been laid out yet.';

  const assets = project.assetRequests.length
    ? project.assetRequests
        .map((asset) => `- ${asset.title}${asset.detail ? `: ${asset.detail}` : ''}`)
        .join('\n')
    : '- Nothing recorded.';

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

FEES AS RECORDED
${lines}

THE PLAN AS RECORDED
${phases}

WHAT WE NEED FROM THE CLIENT
${assets}

STANDARD TERMS
${
  terms
    ? `${terms.title}, version ${terms.version}. Accepted separately at signing — do NOT restate them.`
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
    'Save a new version of this document. Pass the COMPLETE document body, not a fragment — it replaces what is there. Use this whenever the person asks you to write, rewrite, shorten, expand or change the document.',
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
      return { result: 'That is too short to be a document. Write the whole thing.' };
    }
    if (markdown.length > 200_000) {
      return { result: 'That is too long to save. Make it shorter.' };
    }

    const document = await db.document.findUnique({
      where: { id: context.documentId },
      select: {
        id: true,
        status: true,
        versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true } },
      },
    });

    if (!document) return { result: 'That document no longer exists.' };
    if (document.status === 'signed') {
      return {
        result:
          'This document has been signed and cannot be changed. Tell them a change order is the way to alter a signed agreement.',
      };
    }

    const version = (document.versions[0]?.version ?? 0) + 1;

    await db.documentVersion.create({
      data: {
        documentId: document.id,
        version,
        bodyMarkdown: markdown.trim(),
        changeNote: typeof changeNote === 'string' && changeNote.trim()
          ? changeNote.trim().slice(0, 200)
          : 'Drafted by the assistant',
        aiAssisted: true,
        aiModel: process.env.ANTHROPIC_AGENT_MODEL || 'claude-sonnet-5',
        createdById: context.staffId,
      },
    });

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
