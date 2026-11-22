import 'server-only';
import { db } from '@/lib/db';
import { EngagementType, ServiceLine, type ProjectStatus } from '@/generated/prisma/client';
import { OPENING_STATUSES } from '@/lib/console/transitions';
import { isOneOf } from '@/lib/console/form';
import { parseDateInput } from '@/lib/console/money';

/**
 * The rules for a new project, shared by the New client form, the New project
 * form and the console assistant. createProjectForClient and
 * createClientRecord do the writing.
 */

/** A project as typed, every value a string. */
export type NewProjectDraft = {
  name: string;
  serviceLine: string;
  engagementType?: string;
  status?: string;
  templateId?: string;
  startDate?: string;
  targetDate?: string;
  summary?: string;
  ownerId?: string;
};

export type NewProjectField =
  | 'name'
  | 'serviceLine'
  | 'engagementType'
  | 'status'
  | 'templateId'
  | 'startDate'
  | 'targetDate'
  | 'ownerId';

export type CheckedProject = {
  name: string;
  serviceLine: ServiceLine;
  engagementType: EngagementType;
  status: ProjectStatus;
  templateId: string | null;
  summary: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  /** Null when nobody was chosen to lead it. */
  ownerId: string | null;
};

export type ProjectCheck =
  | { ok: true; value: CheckedProject }
  | { ok: false; message: string; field: NewProjectField };

export async function checkNewProject(draft: NewProjectDraft): Promise<ProjectCheck> {
  const refuse = (message: string, field: NewProjectField): ProjectCheck => ({
    ok: false,
    message,
    field,
  });
  const text = (value: string | undefined) => (value ?? '').trim();

  const name = text(draft.name);
  if (name.length < 2 || name.length > 160) return refuse('Give the project a name.', 'name');

  const serviceLine = text(draft.serviceLine);
  if (!isOneOf(Object.values(ServiceLine), serviceLine)) {
    return refuse('Choose a service line.', 'serviceLine');
  }

  const engagementType = text(draft.engagementType) || 'fixed_price_project';
  if (!isOneOf(Object.values(EngagementType), engagementType)) {
    return refuse('Choose how this work is billed.', 'engagementType');
  }

  const status = text(draft.status) || 'lead';
  if (!isOneOf(OPENING_STATUSES, status)) {
    return refuse('Choose where this project stands today.', 'status');
  }

  const templateId = text(draft.templateId);
  if (templateId) {
    const template = await db.projectTemplate.findUnique({
      where: { id: templateId },
      select: { serviceLine: true },
    });
    if (!template) return refuse('That plan no longer exists. Pick another.', 'templateId');
    if (template.serviceLine !== serviceLine) {
      return refuse('That plan belongs to a different service line.', 'templateId');
    }
  }

  const startRaw = text(draft.startDate);
  const targetRaw = text(draft.targetDate);
  const startDate = parseDateInput(startRaw);
  const targetDate = parseDateInput(targetRaw);
  if (startDate && targetDate && targetDate < startDate) {
    return refuse('The target date is before the start date.', 'targetDate');
  }

  // Someone on the team who can still sign in, or nobody yet.
  const ownerChoice = text(draft.ownerId);
  const owner = ownerChoice
    ? await db.staffUser.findFirst({
        where: { id: ownerChoice, isActive: true },
        select: { id: true },
      })
    : null;
  if (ownerChoice && !owner) return refuse('Choose someone on the team to lead it.', 'ownerId');

  return {
    ok: true,
    value: {
      name,
      serviceLine,
      engagementType,
      status,
      templateId: templateId || null,
      summary: text(draft.summary) || null,
      startDate,
      targetDate,
      ownerId: owner?.id ?? null,
    },
  };
}
