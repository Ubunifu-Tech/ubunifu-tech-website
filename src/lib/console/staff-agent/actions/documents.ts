import 'server-only';
import type { DocumentKind } from '@/generated/prisma/client';
import { AGENT_MODEL } from '@/lib/console/agent';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { carriesFees, hasFeesToken } from '@/lib/console/fees';
import { toConfirmCount } from '@/lib/console/to-confirm';
import { diffParagraphs } from '@/lib/console/diff';
import {
  checkBody,
  checkNewDocument,
  createDraftDocument,
  revisable,
  saveRevision,
  type Revisable,
} from '@/lib/console/services/documents';
import { StepRefused } from './clients';
import { text, type PlanAction, type ProjectFacts, type StepDiff } from './types';

type Value = { project: ProjectFacts; kind: DocumentKind; title: string; bodyMarkdown: string };

export const createDocument: PlanAction<Value> = {
  name: 'create_document',
  label: 'Draft document',
  description:
    'Start a proposal, agreement or other document on a project, as a draft. It is never sent from here: the person reads it, edits it and sends it from its own page. Give body_markdown when you were asked to write it; leave it out for an empty draft.',
  permission: 'documents',
  properties: {
    project: { type: 'string', description: 'The project: "step:N" for one started earlier in this plan, or its reference.' },
    kind: {
      type: 'string',
      enum: ['proposal', 'contract', 'change_order', 'statement_of_work', 'handover', 'other'],
      description: 'contract is an agreement.',
    },
    title: { type: 'string', description: 'Such as "Website care and email service agreement".' },
    body_markdown: {
      type: 'string',
      description:
        'The whole document in markdown, starting at a ## heading. Never write prices: put {{fees}} on a line of its own where the fee table belongs. Write [TO CONFIRM: what is missing] for anything you were not told.',
    },
  },
  required: ['project', 'kind', 'title'],

  check: async (input, env) => {
    const project = await env.project(input.project);
    if (typeof project === 'string') return { ok: false, message: project };
    const checked = checkNewDocument({
      kind: text(input.kind),
      title: text(input.title),
      bodyMarkdown: text(input.body_markdown, 250_000),
    });
    if (!checked.ok) return { ok: false, message: checked.message };
    const { kind, title, bodyMarkdown } = checked.value;
    const markers = toConfirmCount(bodyMarkdown);
    const words = bodyMarkdown ? bodyMarkdown.split(/\s+/).length : 0;

    return {
      ok: true,
      value: { project, kind, title, bodyMarkdown },
      subject: title,
      details: [
        `${DOCUMENT_KIND_LABEL[kind]} for ${project.name}`,
        words > 0 ? `About ${words} words, saved as a draft` : 'Empty draft, to write on its page',
        ...(words > 0 && carriesFees(kind)
          ? [hasFeesToken(bodyMarkdown) ? 'Fee table filled in from the project' : 'Fee table added at the end when sent']
          : []),
        ...(markers > 0 ? [`${markers} to confirm before it can be sent`] : []),
        'Not sent to the client',
      ],
    };
  },

  run: async ({ project, kind, title, bodyMarkdown }, env) => {
    if (!project.id) throw new StepRefused('The project this document belongs to was not started.');
    const document = await createDraftDocument({
      projectId: project.id,
      kind,
      title,
      bodyMarkdown,
      staffId: env.staff.id,
      aiModel: AGENT_MODEL,
    });
    return { summary: `${document.reference} drafted`, href: `/documents/${document.reference}` };
  },
};

/** How much unchanged text is kept either side of a change, so it can be placed. */
const AROUND = 1;

/**
 * What a rewrite changes, cut down to the changes and a block of what is
 * around each, with a gap marked where unchanged text was left out.
 */
function changes(reference: string, before: string, after: string): StepDiff {
  const parts = diffParagraphs(before, after);
  const keep = new Set<number>();
  parts.forEach((part, index) => {
    if (part.op === 'same') return;
    for (let at = index - AROUND; at <= index + AROUND; at += 1) keep.add(at);
  });
  const shown: StepDiff['parts'] = [];
  parts.forEach((part, index) => {
    if (keep.has(index)) shown.push({ op: part.op, text: part.text.slice(0, 1200) });
    else if (shown[shown.length - 1]?.op !== 'gap') shown.push({ op: 'gap', text: '' });
  });
  // Nothing is said about text left out at the very start or the very end.
  while (shown[0]?.op === 'gap') shown.shift();
  while (shown[shown.length - 1]?.op === 'gap') shown.pop();
  return {
    title: before ? `Changes to ${reference}` : `First draft of ${reference}`,
    added: parts.filter((part) => part.op === 'added').length,
    removed: parts.filter((part) => part.op === 'removed').length,
    parts: shown.slice(0, 80),
  };
}

type Revision = { document: Revisable; body: string; changeNote: string };

export const reviseDocument: PlanAction<Revision> = {
  name: 'revise_document',
  label: 'Revise document',
  description:
    'Write or rewrite a proposal or agreement that already exists, as a new version. Use it for a first draft of an empty document and for every change after: shorten, expand, reword, restructure. Read it first with get_document and call drafting_brief for it. Give the COMPLETE document in body_markdown, never a fragment: it replaces the text, so a partial answer loses the rest. Keep everything you were not asked to change, including edits made by hand. The person is shown exactly what changes before anything is saved, and the version before is kept. It is never sent from here.',
  permission: 'documents',
  properties: {
    document: { type: 'string', description: 'Its reference, such as AGR-2026-003.' },
    body_markdown: {
      type: 'string',
      description:
        'The whole document in markdown, starting at a ## heading. Never write prices: {{fees}} on a line of its own marks where the fee table goes. Keep a {{standard}} line where it is. Write [TO CONFIRM: what is missing] for anything you were not told.',
    },
    change_note: { type: 'string', description: 'One line for the version history saying what changed, such as "Split the payment into two stages".' },
  },
  required: ['document', 'body_markdown', 'change_note'],

  check: async (input) => {
    const found = await revisable(text(input.document, 60).replace(/^\/documents\//, '').toUpperCase());
    if (!found.ok) return found;
    const { document } = found;
    const checked = checkBody(text(input.body_markdown, 250_000));
    if (!checked.ok) return checked;
    if (checked.body === document.text) {
      return { ok: false, message: `That is word for word what ${document.reference} already says. Nothing would change.` };
    }
    // A new document has a version already, with nothing in it.
    const first = document.text === '';
    const changeNote = text(input.change_note, 200) || (first ? 'First draft' : 'Revised');
    const diff = changes(document.reference, document.text, checked.body);
    const markers = toConfirmCount(checked.body);

    return {
      ok: true,
      value: { document, body: checked.body, changeNote },
      subject: `${document.reference}, ${document.title}`,
      details: [
        first ? 'The first draft' : `Version ${document.version + 1}, on top of version ${document.version}`,
        changeNote,
        `${diff.added} ${diff.added === 1 ? 'block' : 'blocks'} added, ${diff.removed} taken out`,
        ...(carriesFees(document.kind) ? [hasFeesToken(checked.body) ? 'Fee table filled in from the project' : 'Fee table added at the end when sent'] : []),
        ...(markers > 0 ? [`${markers} to confirm before it can be sent`] : []),
        ...(first ? [] : [`Version ${document.version} is kept`]),
        'Not sent to the client',
      ],
      diff,
      // Written from this version: if another is saved before Confirm, the
      // changes shown are no longer the changes that would be made.
      pin: `${document.id}:${document.version}`,
    };
  },

  run: async ({ document, body, changeNote }, env) => {
    const saved = await saveRevision({
      documentId: document.id,
      reference: document.reference,
      fromVersion: document.version,
      bodyMarkdown: body,
      changeNote,
      staffId: env.staff.id,
      aiModel: AGENT_MODEL,
    });
    if (!saved.ok) throw new StepRefused(saved.message);
    return { summary: `Version ${saved.version} saved`, href: `/documents/${document.reference}?step=write` };
  },
};
