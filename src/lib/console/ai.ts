import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { DocumentKind } from '@/generated/prisma/client';
import { formatDate, formatMoney } from './money';
import { DOCUMENT_KIND_LABEL } from './documents';

/**
 * The drafting copilot.
 *
 * It writes a first draft from the project's own data and nothing else. A
 * human edits it, and a human sends it — the model never touches a document
 * that has been sent, never sets a price, and never invents a term. What it is
 * good for is the twenty minutes of structure and boilerplate between "we
 * agreed this on the phone" and "here is something to read".
 *
 * Provenance is recorded on the version it produces (aiAssisted, aiModel,
 * aiPromptSummary), because in two years the question "did a person write this
 * clause" has to be answerable.
 */

export const DRAFT_MODEL = 'claude-opus-5';

export type DraftResult =
  | { ok: true; markdown: string; model: string }
  | { ok: false; error: string };

export type DraftContext = {
  kind: DocumentKind;
  projectName: string;
  projectReference: string;
  serviceLine: string;
  engagementType: string;
  summary: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  clientName: string;
  clientLegalName: string | null;
  clientCountry: string;
  orgLegalName: string;
  orgCountry: string;
  currency: string;
  lines: { label: string; terms: string | null; amountMinor: number; billingKind: string }[];
  phases: { name: string; goal: string | null; deliverables: string[] }[];
  assets: { title: string; detail: string | null }[];
  termsTitle: string | null;
  termsVersion: number | null;
  instruction: string;
};

/**
 * Everything the model is allowed to know, rendered as plain text.
 *
 * Built here rather than handing it the database, so what goes to the API is
 * exactly this: one project's commercial facts. No other client's figures, no
 * contact details beyond the organisation names, and nothing from the audit
 * trail.
 */
function brief(context: DraftContext): string {
  const money = (minor: number) => formatMoney(minor, context.currency);

  const lines = context.lines.length
    ? context.lines
        .map(
          (line) =>
            `- ${line.label} — ${money(line.amountMinor)} (${line.billingKind.replace(/_/g, ' ')})${
              line.terms ? `. Terms: ${line.terms}` : ''
            }`,
        )
        .join('\n')
    : '- No fee lines have been priced yet.';

  const phases = context.phases.length
    ? context.phases
        .map(
          (phase) =>
            `- ${phase.name}${phase.goal ? `: ${phase.goal}` : ''}\n${phase.deliverables
              .map((item) => `  · ${item}`)
              .join('\n')}`,
        )
        .join('\n')
    : '- No plan has been laid out yet.';

  const assets = context.assets.length
    ? context.assets.map((asset) => `- ${asset.title}${asset.detail ? `: ${asset.detail}` : ''}`).join('\n')
    : '- Nothing recorded.';

  return `SUPPLIER: ${context.orgLegalName}, ${context.orgCountry}
CLIENT: ${context.clientLegalName ?? context.clientName}, ${context.clientCountry}
PROJECT: ${context.projectName} (${context.projectReference})
SERVICE LINE: ${context.serviceLine}
HOW IT IS BILLED: ${context.engagementType.replace(/_/g, ' ')}
CURRENCY: ${context.currency}
STARTS: ${context.startDate ? formatDate(context.startDate) : 'not set'}
TARGET: ${context.targetDate ? formatDate(context.targetDate) : 'not set'}
WHAT THE WORK IS: ${context.summary ?? 'not written yet'}

FEES AS RECORDED:
${lines}

THE PLAN AS RECORDED:
${phases}

WHAT WE NEED FROM THE CLIENT:
${assets}

STANDARD TERMS: ${
    context.termsTitle
      ? `${context.termsTitle}, version ${context.termsVersion}. These are accepted separately at signing — do NOT restate them in the document.`
      : 'none published yet'
  }

WHAT THE STAFF MEMBER ASKED FOR:
${context.instruction || 'A first draft, nothing specific.'}`;
}

const SYSTEM = `You draft business documents for Ubunifu Technologies, a software and design agency in Tanzania. You are writing a first draft that a member of staff will edit and take responsibility for.

HOW TO WRITE
- Plain British English. Short sentences. Write as a careful person would speak, not as a legal template sounds.
- Markdown only: ## and ### headings, paragraphs, - bullets, numbered lists, **bold**. No tables, no links, no code blocks, no HTML.
- Start at a ## heading. Do not write a document title as an H1 and do not write a preamble about what you are about to produce.
- Return the document and nothing else. No commentary before or after it.

WHAT YOU MAY AND MAY NOT DO
- Use only the figures, dates, names and deliverables given to you. Never invent a price, a date, a deadline or a payment term.
- If something needed is missing, write it as [TO CONFIRM: what is missing] inline. Do not guess and do not quietly leave it out. A staff member searches for those markers before sending.
- Do not restate the standard terms of engagement. They are a separate, versioned document the client accepts alongside this one, and duplicating them creates two texts that can disagree.
- Do not write clauses about liability, indemnity, insurance, governing law or dispute resolution. Those live in the standard terms and are not yours to draft.
- Do not address the client by a contact's personal name. The document is between two organisations.

You are producing a draft, not advice. A person decides what is sent.`;

/**
 * Drafts a document.
 *
 * Streams, because a contract is long output and a non-streaming request at
 * this size risks an HTTP timeout. Adaptive thinking is on: getting the
 * commercial structure right matters more here than latency.
 */
export async function draftDocument(context: DraftContext): Promise<DraftResult> {
  const kindLabel = DOCUMENT_KIND_LABEL[context.kind];

  try {
    /**
     * Constructed inside the try, and with no arguments.
     *
     * An unset ANTHROPIC_API_KEY does not mean there are no credentials — the
     * SDK also reads ANTHROPIC_AUTH_TOKEN and a signed-in profile on disk. A
     * pre-flight check on the env var alone would report "no assistant here"
     * on a machine where it works perfectly well, so the attempt is made and
     * a genuine credential failure is reported by the catch below.
     */
    const client = new Anthropic();

    const stream = client.messages.stream({
      model: DRAFT_MODEL,
      max_tokens: 32000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [
        {
          role: 'user',
          content: `Draft a ${kindLabel.toLowerCase()} from the following. Everything you need is here.\n\n${brief(context)}`,
        },
      ],
    });

    const message = await stream.finalMessage();

    // A policy decline arrives as a 200 with no usable content, so the stop
    // reason is checked before the content is read.
    if (message.stop_reason === 'refusal') {
      return {
        ok: false,
        error: 'The assistant declined to draft this one. Write it by hand.',
      };
    }

    const markdown = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!markdown) {
      return { ok: false, error: 'The assistant returned nothing. Try again, or write it by hand.' };
    }

    return { ok: true, markdown, model: DRAFT_MODEL };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        error: 'The Anthropic credentials were rejected. Check ANTHROPIC_API_KEY.',
      };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Rate limited by the API. Wait a moment and try again.' };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `The drafting assistant failed (${error.status}). Nothing was saved.` };
    }
    console.error('Draft failed', error);
    return {
      ok: false,
      error:
        'The drafting assistant could not be reached — most often because ANTHROPIC_API_KEY is not set here. Nothing was saved, and everything else on this screen works without it.',
    };
  }
}
