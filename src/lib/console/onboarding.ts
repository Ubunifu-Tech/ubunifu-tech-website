import 'server-only';
import { db } from '@/lib/db';
import type { BillingKind, Prisma, ProjectStatus } from '@/generated/prisma/client';
import { slugify } from '@/lib/slug';

/**
 * Creating a client by hand.
 *
 * Most work does not arrive through the website form. It arrives as a phone
 * call, a WhatsApp message, or a conversation at an event, and by the time
 * anyone opens the console the engagement is already real. This module is the
 * path for that: an organisation, the person we actually talk to, and
 * optionally the first project laid out from a template — created together, in
 * one transaction, so a half-made client can never be left behind.
 */

/** URL-safe, collision-checked outside this function. */
export { slugify };

/**
 * Appends -2, -3 … until the slug is free.
 *
 * Two clients really can share a name — "Serengeti Safaris" is not unique in
 * Tanzania — so this resolves the clash rather than refusing the record.
 */
async function freeSlug(
  base: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || 'client';
  let candidate = root;
  let suffix = 1;
  while (await taken(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

export function clientSlugTaken(slug: string): Promise<boolean> {
  return db.client.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);
}

export function projectSlugTaken(slug: string): Promise<boolean> {
  return db.project.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);
}

/**
 * UBU-2026-007. Sequential within the calendar year, because that is how these
 * get referred to out loud and on invoices.
 *
 * The number is derived from the highest reference already issued this year
 * rather than from a row count, so deleting a project does not hand its number
 * to the next one — references appear on documents a client keeps, and reusing
 * one would make two different projects look like the same job.
 */
export async function nextProjectReference(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `UBU-${year}-`;

  const latest = await db.project.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });

  const previous = latest ? Number.parseInt(latest.reference.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function addDays(from: Date, days: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

function intervalFor(kind: BillingKind): number | null {
  if (kind === 'recurring_monthly') return 1;
  if (kind === 'recurring_annual') return 12;
  return null;
}

export type NewClientInput = {
  client: {
    name: string;
    legalName?: string | null;
    country: string;
    currency: string;
    website?: string | null;
    notes?: string | null;
  };
  contact: {
    name: string;
    /** Null when they will give it themselves, from a shared setup link. */
    email: string | null;
    role?: string | null;
    phone?: string | null;
  };
  project?: {
    name: string;
    serviceLine: Prisma.ProjectCreateInput['serviceLine'];
    engagementType: Prisma.ProjectCreateInput['engagementType'];
    status: ProjectStatus;
    templateId?: string | null;
    summary?: string | null;
    startDate?: Date | null;
    targetDate?: Date | null;
  };
  /** Set when this client came from a website enquiry, to close the loop. */
  enquiryId?: string | null;
  staffId: string;
};

export type NewClientResult = {
  clientId: string;
  clientSlug: string;
  contactId: string;
  projectId: string | null;
  reference: string | null;
};

/**
 * One transaction. A client whose contact failed to save is a record nobody can
 * reach, and a project with no phases is worse than no project, so either all
 * of it exists or none of it does.
 */
export async function createClientRecord(input: NewClientInput): Promise<NewClientResult> {
  const clientSlug = await freeSlug(slugify(input.client.name), clientSlugTaken);

  const projectSlug = input.project
    ? await freeSlug(slugify(input.project.name), projectSlugTaken)
    : null;
  const reference = input.project ? await nextProjectReference() : null;

  return db.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: input.client.name,
        slug: clientSlug,
        legalName: input.client.legalName || null,
        country: input.client.country,
        currency: input.client.currency,
        website: input.client.website || null,
        notes: input.client.notes || null,
        contacts: {
          create: {
            name: input.contact.name,
            email: input.contact.email,
            role: input.contact.role || null,
            phone: input.contact.phone || null,
            // The first person on a new client is the one we deal with, so they
            // sign and receive billing until someone says otherwise.
            isPrimary: true,
          },
        },
      },
      select: { id: true, contacts: { select: { id: true } } },
    });

    const contactId = client.contacts[0]!.id;

    /**
     * Closes the enquiry in the same transaction that creates the client.
     *
     * Conditional on it still being unconverted, so two staff members
     * onboarding the same enquiry cannot both claim it — the second update
     * matches nothing and the second client is created unlinked rather than
     * silently stealing the first one's enquiry.
     */
    const closeEnquiry = async (projectId: string | null) => {
      if (!input.enquiryId) return;
      await tx.enquiry.updateMany({
        where: { id: input.enquiryId, clientId: null, status: { not: 'converted' } },
        data: { clientId: client.id, projectId, status: 'converted' },
      });
    };

    if (!input.project || !projectSlug || !reference) {
      await closeEnquiry(null);
      return { clientId: client.id, clientSlug, contactId, projectId: null, reference: null };
    }

    const start = input.project.startDate ?? new Date();

    const project = await tx.project.create({
      data: {
        clientId: client.id,
        name: input.project.name,
        slug: projectSlug,
        reference,
        serviceLine: input.project.serviceLine,
        engagementType: input.project.engagementType,
        status: input.project.status,
        summary: input.project.summary || null,
        currency: input.client.currency,
        startDate: input.project.startDate ?? null,
        targetDate: input.project.targetDate ?? null,
        ownerId: input.staffId,
        statusEvents: {
          create: {
            to: input.project.status,
            actorType: 'staff',
            actorId: input.staffId,
            note: 'Created from the console',
          },
        },
      },
      select: { id: true },
    });

    if (input.project.templateId) {
      await applyTemplate(tx, {
        projectId: project.id,
        templateId: input.project.templateId,
        start,
        currency: input.client.currency,
      });
    }

    await closeEnquiry(project.id);

    return { clientId: client.id, clientSlug, contactId, projectId: project.id, reference };
  });
}

export type NewProjectInput = {
  clientId: string;
  name: string;
  serviceLine: Prisma.ProjectCreateInput['serviceLine'];
  engagementType: Prisma.ProjectCreateInput['engagementType'];
  status: ProjectStatus;
  templateId?: string | null;
  summary?: string | null;
  startDate?: Date | null;
  targetDate?: Date | null;
  /**
   * What this project is priced and invoiced in. Defaults to the client's own
   * currency; set when one piece of work is billed differently, such as local
   * hosting paid in TZS by a client whose build was quoted in USD.
   */
  currency?: string;
  staffId: string;
};

/**
 * A second project for a client who already exists.
 *
 * Separate from createClientRecord rather than a flag on it, because the two
 * answer different questions: one is "who is this", the other is "what are we
 * doing for them". Sharing the reference, slug and template logic is what
 * matters; sharing the form would mean asking for a client's country again
 * every time they come back with more work.
 */
export async function createProjectForClient(
  input: NewProjectInput,
): Promise<{ projectId: string; slug: string; reference: string }> {
  const client = await db.client.findFirstOrThrow({
    where: { id: input.clientId, deletedAt: null },
    select: { id: true, currency: true },
  });

  const projectSlug = await freeSlug(slugify(input.name), projectSlugTaken);
  const reference = await nextProjectReference();
  const start = input.startDate ?? new Date();
  const currency = input.currency ?? client.currency;

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        clientId: client.id,
        name: input.name,
        slug: projectSlug,
        reference,
        serviceLine: input.serviceLine,
        engagementType: input.engagementType,
        status: input.status,
        summary: input.summary || null,
        currency,
        startDate: input.startDate ?? null,
        targetDate: input.targetDate ?? null,
        ownerId: input.staffId,
        statusEvents: {
          create: {
            to: input.status,
            actorType: 'staff',
            actorId: input.staffId,
            note: 'Created from the console',
          },
        },
      },
      select: { id: true },
    });

    if (input.templateId) {
      await applyTemplate(tx, {
        projectId: project.id,
        templateId: input.templateId,
        start,
        currency,
      });
    }

    return { projectId: project.id, slug: projectSlug, reference };
  });
}

/**
 * Copies a template into a real project.
 *
 * Copied, never referenced: once a project exists its plan belongs to that
 * project, and editing the template afterwards must not rewrite the phases a
 * client has already agreed to.
 */
export async function applyTemplate(
  tx: Prisma.TransactionClient,
  options: {
    projectId: string;
    templateId: string;
    start: Date;
    currency: string;
  },
): Promise<void> {
  const template = await tx.projectTemplate.findUnique({
    where: { id: options.templateId },
    select: {
      phases: {
        orderBy: { position: 'asc' },
        select: {
          name: true,
          goal: true,
          position: true,
          startDayOffset: true,
          endDayOffset: true,
          deliverables: {
            orderBy: { position: 'asc' },
            select: { title: true, detail: true, position: true, isClientVisible: true },
          },
        },
      },
      assetRequests: {
        orderBy: { position: 'asc' },
        select: { title: true, detail: true, category: true, position: true },
      },
      lineItems: {
        orderBy: { position: 'asc' },
        select: {
          label: true,
          description: true,
          billingKind: true,
          amountMinor: true,
          currency: true,
          terms: true,
          position: true,
        },
      },
    },
  });

  if (!template) return;

  for (const phase of template.phases) {
    await tx.projectPhase.create({
      data: {
        projectId: options.projectId,
        name: phase.name,
        goal: phase.goal,
        position: phase.position,
        startDate:
          phase.startDayOffset === null ? null : addDays(options.start, phase.startDayOffset),
        endDate: phase.endDayOffset === null ? null : addDays(options.start, phase.endDayOffset),
        deliverables: {
          create: phase.deliverables.map((deliverable) => ({
            title: deliverable.title,
            detail: deliverable.detail,
            position: deliverable.position,
            isClientVisible: deliverable.isClientVisible,
          })),
        },
      },
    });
  }

  if (template.assetRequests.length > 0) {
    await tx.assetRequest.createMany({
      data: template.assetRequests.map((asset) => ({
        projectId: options.projectId,
        title: asset.title,
        detail: asset.detail,
        category: asset.category,
        position: asset.position,
      })),
    });
  }

  for (const line of template.lineItems) {
    const intervalMonths = intervalFor(line.billingKind);
    await tx.lineItem.create({
      data: {
        projectId: options.projectId,
        label: line.label,
        description: line.description,
        billingKind: line.billingKind,
        // The template's currency is a suggestion; the project's own currency
        // wins, because one project cannot be invoiced in two of them.
        amountMinor: line.amountMinor,
        currency: options.currency,
        terms: line.terms,
        position: line.position,
        intervalMonths,
        /**
         * Left null deliberately.
         *
         * A renewal date is only meaningful once the thing renewing exists. A
         * date pre-filled here is anchored to the day somebody typed the client
         * in, which is not when the domain was registered or the hosting began
         * — so it would bill at the wrong time, and worse, it would satisfy the
         * launch guard that exists precisely to catch a renewal with no date.
         * A guard that always passes is not a guard. The date is set when the
         * line goes live, on the project screen, by someone who knows it.
         */
        nextDueAt: null,
      },
    });
  }
}
