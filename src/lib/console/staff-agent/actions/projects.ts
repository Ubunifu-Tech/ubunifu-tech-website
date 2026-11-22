import 'server-only';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/console/auth';
import { createProjectForClient } from '@/lib/console/onboarding';
import { ENGAGEMENTS, SERVICE_LINES } from '@/lib/console/project-status';
import { formatDate } from '@/lib/console/money';
import { checkNewProject, type CheckedProject } from '@/lib/console/services/projects';
import { StepRefused } from './clients';
import { text, type ClientFacts, type PlanAction } from './types';

type Value = { client: ClientFacts; project: CheckedProject; leadName: string | null };

const label = (list: { value: string; label: string }[], value: string) =>
  list.find((entry) => entry.value === value)?.label ?? value;

export const createProject: PlanAction<Value> = {
  name: 'create_project',
  label: 'Start project',
  description:
    'Start a project for a client. It begins with an empty plan and no fees: add each fee as its own add_fee step. Billed in the client\'s currency.',
  permission: 'projects',
  properties: {
    client: { type: 'string', description: 'The client: "step:N" for one added earlier in this plan, or its exact name.' },
    name: { type: 'string', description: 'The project name, such as "Website care and email 2027".' },
    service_line: {
      type: 'string',
      enum: SERVICE_LINES.map((line) => line.value),
      description: SERVICE_LINES.map((line) => `${line.value}: ${line.label}`).join('. '),
    },
    engagement_type: {
      type: 'string',
      enum: ENGAGEMENTS.map((entry) => entry.value),
      description: 'How the work is billed. fixed_price_project if not said. retainer for ongoing care billed regularly.',
    },
    status: {
      type: 'string',
      enum: ['lead', 'in_progress'],
      description: 'lead while nothing is agreed yet (the default). in_progress only if the person said the work has started.',
    },
    start_date: { type: 'string', description: 'YYYY-MM-DD, if given.' },
    target_date: { type: 'string', description: 'YYYY-MM-DD, if given.' },
    summary: { type: 'string', description: 'What the work is, in a sentence or two, from what you were told.' },
    lead: { type: 'string', description: 'Who leads it: a name from THE TEAM. Leave out for the person you are talking to.' },
  },
  required: ['client', 'name', 'service_line'],

  check: async (input, env) => {
    const client = await env.client(input.client);
    if (typeof client === 'string') return { ok: false, message: client };

    let ownerId = env.staff.id;
    let leadName: string | null = null;
    const lead = text(input.lead, 120);
    if (lead) {
      const found = await db.staffUser.findMany({
        where: { isActive: true, name: { contains: lead, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 2,
      });
      if (found.length !== 1) {
        return { ok: false, message: `Nobody on the team is called exactly ${lead}. Use a name from THE TEAM.` };
      }
      ownerId = found[0]!.id;
      leadName = found[0]!.name;
    }

    const checked = await checkNewProject({
      name: text(input.name),
      serviceLine: text(input.service_line),
      engagementType: text(input.engagement_type),
      status: text(input.status),
      startDate: text(input.start_date),
      targetDate: text(input.target_date),
      summary: text(input.summary, 4000),
      ownerId,
    });
    if (!checked.ok) return { ok: false, message: checked.message };
    const project = checked.value;
    for (const [field, raw] of [['start_date', input.start_date], ['target_date', input.target_date]] as const) {
      if (text(raw) && !/^\d{4}-\d{2}-\d{2}$/.test(text(raw))) {
        return { ok: false, message: `${field} should be written YYYY-MM-DD.` };
      }
    }

    if (client.id) {
      const same = await db.project.findFirst({
        where: { clientId: client.id, deletedAt: null, name: { equals: project.name, mode: 'insensitive' } },
        select: { reference: true },
      });
      if (same) {
        return {
          ok: false,
          message: `${client.name} already has a project called ${project.name} (${same.reference}). Use it, or choose another name.`,
        };
      }
    }

    return {
      ok: true,
      value: { client, project, leadName },
      subject: project.name,
      details: [
        `For ${client.name}`,
        label(SERVICE_LINES, project.serviceLine),
        `${label(ENGAGEMENTS, project.engagementType)}, in ${client.currency}`,
        project.status === 'in_progress' ? 'Work already under way' : 'Opens as a deal',
        ...(project.startDate ? [`Starts ${formatDate(project.startDate)}`] : []),
        ...(project.targetDate ? [`Target ${formatDate(project.targetDate)}`] : []),
        `Led by ${leadName ?? env.staff.name}`,
      ],
      produces: {
        project: {
          id: null,
          slug: null,
          name: project.name,
          currency: client.currency,
          clientName: client.name,
          feeLabels: [],
        },
      },
    };
  },

  run: async ({ client, project }, env) => {
    if (!client.id) throw new StepRefused('The client this project is for was not added.');
    const created = await createProjectForClient({
      clientId: client.id,
      ...project,
      currency: client.currency,
      staffId: env.staff.id,
    });
    await recordAudit({
      actorType: 'staff',
      actorId: env.staff.id,
      action: 'project.created',
      entityType: 'Project',
      entityId: created.projectId,
      summary: `${created.reference}: ${project.name} for ${client.name}`,
      metadata: { viaAssistant: true },
    });
    return {
      summary: `${created.reference} started`,
      href: `/projects/${created.slug}`,
      produces: {
        project: {
          id: created.projectId,
          slug: created.slug,
          name: project.name,
          currency: client.currency,
          clientName: client.name,
          feeLabels: [],
        },
      },
    };
  },
};
