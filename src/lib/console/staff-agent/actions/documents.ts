import 'server-only';
import type { DocumentKind } from '@/generated/prisma/client';
import { AGENT_MODEL } from '@/lib/console/agent';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { carriesFees, hasFeesToken } from '@/lib/console/fees';
import { toConfirmCount } from '@/lib/console/to-confirm';
import { checkNewDocument, createDraftDocument } from '@/lib/console/services/documents';
import { StepRefused } from './clients';
import { text, type PlanAction, type ProjectFacts } from './types';

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
