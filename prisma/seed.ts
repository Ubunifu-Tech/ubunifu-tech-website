/**
 * Seeds the console with:
 *
 *   1. A staff owner.
 *   2. A default project template per service line, so every kind of work we
 *      sell starts from a plan that suits it rather than from a website plan.
 *   3. The real Nifuate Tanzania Adventures proposal, loaded as live data.
 *
 * The Nifuate record is not decoration. It is the hardest case we have on
 * paper — a 50/50 split, an annual renewal, a deferred line, a paused line and
 * a waived line all on one project — so seeding it is how we find out whether
 * the schema actually holds a real engagement.
 *
 * Idempotent: re-running updates rather than duplicating.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { databaseTarget } from '../src/lib/db-connection';
import { PrismaClient, BillingKind, LineItemStatus } from '../src/generated/prisma/client';
import { loadProducts, loadTemplates, loadTerms } from './reference-data';

process.loadEnvFile('.env');

const db = new PrismaClient({
  adapter: new PrismaPg(databaseTarget(process.env.DATABASE_URL!)),
});

/** USD amounts in the proposal are whole dollars; store them as cents. */
const usd = (dollars: number) => Math.round(dollars * 100);

async function seedStaff() {
  return db.staffUser.upsert({
    where: { email: 'info@ubunifutech.com' },
    update: {},
    create: {
      email: 'info@ubunifutech.com',
      name: 'Richard Pallangyo',
      role: 'owner',
    },
  });
}



/** The proposal's own dates, so the seeded project matches the document. */
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function seedNifuate(ownerId: string) {
  const client = await db.client.upsert({
    where: { slug: 'nifuate-tanzania-adventures' },
    update: {},
    create: {
      name: 'Nifuate Tanzania Adventures',
      slug: 'nifuate-tanzania-adventures',
      country: 'TZ',
      currency: 'USD',
      notes: 'Trekking, safari bush, and beach excursions.',
      contacts: {
        create: {
          name: 'Nifuate Founder',
          email: 'founder@nifuate.example',
          role: 'Founder',
          isPrimary: true,
        },
      },
    },
  });

  const project = await db.project.upsert({
    where: { slug: 'nifuate-website' },
    update: {},
    create: {
      clientId: client.id,
      name: 'Nifuate Tanzania Adventures website',
      slug: 'nifuate-website',
      reference: 'UBU-2026-001',
      serviceLine: 'web',
      engagementType: 'fixed_price_project',
      status: 'proposal_sent',
      currency: 'USD',
      summary:
        'End-to-end design, development and launch of the official website, showcasing trekking, safari bush and beach excursions.',
      startDate: d('2026-09-21'),
      targetDate: d('2026-10-31'),
      ownerId,
    },
  });

  // ── Brand kit, from section 2 of the proposal ────────────────────────────
  const kit = await db.brandKit.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      typography: 'Clean, modern sans-serif typefaces optimising fast scanning and mobile readability.',
      principles: 'Minimalist layouts, generous whitespace, sharp edge radii, and high-contrast CTA elements.',
      imageryDirection:
        'Authentic, high-resolution photography of Tanzanian mountain treks, wildlife safaris and beach landscapes.',
    },
  });

  const COLORS = [
    { name: 'Espresso Brown', hex: '#3A1B06', usage: 'Primary headings, dark UI elements, primary buttons.' },
    { name: 'Warm Sand', hex: '#F9EDE1', usage: 'Page backgrounds, cards, and badges.' },
    { name: 'Savanna Green', hex: '#5C7A4A', usage: 'Primary call-to-action buttons, such as "Book Now" and "WhatsApp Us".' },
    { name: 'Ocean Teal', hex: '#2A6F77', usage: 'Secondary links and highlights.' },
    { name: 'Warm Charcoal', hex: '#4A362B', usage: 'Body copy and long-form text.' },
    { name: 'Warm Taupe', hex: '#D8C9B8', usage: 'Borders, dividers, and card outlines.' },
  ];
  await db.brandColor.deleteMany({ where: { kitId: kit.id } });
  await db.brandColor.createMany({
    data: COLORS.map((c, i) => ({ ...c, kitId: kit.id, position: i })),
  });

  // ── Phases, from section 5 ───────────────────────────────────────────────
  const PHASES = [
    {
      name: 'Initiation, brand kit and domain setup',
      goal: 'Secure the domain, invoice the deposit, finalise the design kit, and collect assets.',
      startDate: d('2026-09-21'),
      endDate: d('2026-09-27'),
      deliverables: [
        'Domain registration secured',
        'Kick-off and deposit invoiced',
        'Design kit and colour palette finalised',
        'Assets collected from the founder',
        'Email provider options researched',
      ],
    },
    {
      name: 'Structural architecture and design',
      goal: 'Wireframes, navigation, and the homepage and package templates.',
      startDate: d('2026-09-28'),
      endDate: d('2026-10-07'),
      deliverables: [
        'Wireframes and navigation for Treks, Bush and Beach',
        'Responsive homepage with WhatsApp and email CTAs',
        'Layout templates for tour package and destination pages',
        'Weekly Update #1: design preview and homepage structure',
      ],
    },
    {
      name: 'Content integration and core development',
      goal: 'Real content in place and the site running on production hosting.',
      startDate: d('2026-10-08'),
      endDate: d('2026-10-17'),
      deliverables: [
        'Tour descriptions, itineraries, galleries and founder bio integrated',
        'Mobile-first performance and speed optimisation',
        'Web hosting infrastructure provisioned',
        'Weekly Update #2: live staging link with content populated',
      ],
    },
    {
      name: 'Testing, final review and launch',
      goal: 'Test across devices, take sign-off, and go live.',
      startDate: d('2026-10-18'),
      endDate: d('2026-10-31'),
      deliverables: [
        'Cross-device, responsiveness and browser testing',
        'Client walkthrough, final edits and formal sign-off',
        'Final development payment and hosting activated',
        'Domain connected, SSL active, site live',
        'Weekly Update #3: completion report and post-launch verification',
      ],
    },
  ];

  await db.projectPhase.deleteMany({ where: { projectId: project.id } });
  for (const [i, phase] of PHASES.entries()) {
    await db.projectPhase.create({
      data: {
        projectId: project.id,
        name: phase.name,
        goal: phase.goal,
        position: i,
        startDate: phase.startDate,
        endDate: phase.endDate,
        status: i === 0 ? 'in_progress' : 'not_started',
        deliverables: {
          create: phase.deliverables.map((title, j) => ({ title, position: j })),
        },
      },
    });
  }

  // ── Asset requests, from section 3 ───────────────────────────────────────
  const webTemplate = await db.projectTemplate.findFirst({
    where: { serviceLine: 'web', isDefault: true },
    include: { assetRequests: { orderBy: { position: 'asc' } } },
  });
  await db.assetRequest.deleteMany({ where: { projectId: project.id } });
  if (webTemplate) {
    await db.assetRequest.createMany({
      data: webTemplate.assetRequests.map((a) => ({
        projectId: project.id,
        title: a.title,
        detail: a.detail,
        category: a.category,
        position: a.position,
      })),
    });
  }

  // ── Money, from section 4 ────────────────────────────────────────────────
  // This is the part worth checking: one project carrying a one-off, a 50/50
  // split, two annual renewals, a deferred line, a paused line and a waived one.
  const LINES: Array<{
    label: string;
    description: string;
    billingKind: BillingKind;
    status: LineItemStatus;
    amount: number;
    terms: string;
    intervalMonths?: number;
    nextDueAt?: Date;
  }> = [
    {
      label: 'Domain name',
      description: 'Annual registration of nifuateadventure.com or nifuatetanzania.com, whichever the founder chooses',
      billingKind: 'recurring_annual',
      status: 'active',
      amount: usd(15),
      terms: 'To be secured on 21 September.',
      intervalMonths: 12,
      nextDueAt: d('2027-09-21'),
    },
    {
      label: 'Website development deposit',
      description: '50% deposit required within week 1',
      billingKind: 'installment',
      status: 'active',
      amount: usd(75),
      terms: 'Due upon kick-off.',
    },
    {
      label: 'Website development balance',
      description: 'Remaining 50% balance',
      billingKind: 'installment',
      status: 'planned',
      amount: usd(75),
      terms: 'Paid upon final sign-off and handover. Total build cost $150.',
    },
    {
      label: 'Web hosting',
      description: 'Annual cloud hosting fee',
      billingKind: 'recurring_annual',
      status: 'planned',
      amount: usd(60),
      terms: 'Payable right before site launch.',
      intervalMonths: 12,
      nextDueAt: d('2027-10-31'),
    },
    {
      label: 'Professional email',
      description: 'Custom domain email setup',
      billingKind: 'recurring_monthly',
      status: 'deferred',
      amount: usd(10),
      terms: 'Deferred. $10/mo current estimate; exploring lower-cost solutions.',
      intervalMonths: 1,
    },
    {
      label: 'Contact form processing',
      description: 'Interactive form backend',
      billingKind: 'recurring_annual',
      status: 'paused',
      amount: usd(60),
      terms: 'Paused. Replaced with direct WhatsApp and email CTA buttons to save $60/yr.',
    },
    {
      label: 'Maintenance and support',
      description: 'First-year maintenance fee',
      billingKind: 'recurring_annual',
      status: 'waived',
      amount: 0,
      terms: 'First-year fee waived; standard $20/yr thereafter.',
      // Waived at zero for year one. The first renewal falls due a year after
      // launch, at which point the amount is raised to $20 and the line made
      // active — the renewal drafts an invoice rather than billing silently.
      intervalMonths: 12,
      nextDueAt: d('2027-10-31'),
    },
  ];

  await db.lineItem.deleteMany({ where: { projectId: project.id } });
  for (const [i, line] of LINES.entries()) {
    await db.lineItem.create({
      data: {
        projectId: project.id,
        label: line.label,
        description: line.description,
        billingKind: line.billingKind,
        status: line.status,
        amountMinor: line.amount,
        currency: 'USD',
        terms: line.terms,
        intervalMonths: line.intervalMonths,
        nextDueAt: line.nextDueAt,
        position: i,
      },
    });
  }

  // ── Managed services: the things with renewal dates ──────────────────────
  const domainLine = await db.lineItem.findFirst({
    where: { projectId: project.id, label: 'Domain name' },
  });
  await db.managedService.deleteMany({ where: { projectId: project.id } });
  await db.managedService.create({
    data: {
      clientId: client.id,
      projectId: project.id,
      lineItemId: domainLine?.id,
      kind: 'domain',
      label: 'nifuatetanzania.com',
      identifier: 'nifuatetanzania.com',
      isActive: true,
      autoRenew: false,
      startsAt: d('2026-09-21'),
      renewsAt: d('2027-09-21'),
    },
  });

  return { client, project };
}




async function main() {
  const owner = await seedStaff();
  const templateCount = await loadTemplates(db, { rebuild: true });
  const terms = await loadTerms(db, { effectiveFrom: d('2026-09-21') });
  await loadProducts(db);
  const { client, project } = await seedNifuate(owner.id);

  const [phases, deliverables, assets, lines] = await Promise.all([
    db.projectPhase.count({ where: { projectId: project.id } }),
    db.deliverable.count({ where: { phase: { projectId: project.id } } }),
    db.assetRequest.count({ where: { projectId: project.id } }),
    db.lineItem.count({ where: { projectId: project.id } }),
  ]);

  const recurring = await db.lineItem.count({
    where: { projectId: project.id, nextDueAt: { not: null } },
  });

  const agreed = await db.lineItem.aggregate({
    where: { projectId: project.id, status: { in: ['active', 'planned'] } },
    _sum: { amountMinor: true },
  });

  console.log('Seeded');
  console.log(`  staff owner        ${owner.email}`);
  console.log(`  project templates  ${templateCount} (one per service line)`);
  console.log(`  standard terms     v${terms.version} — ${terms.title}`);
  console.log(`  client             ${client.name}`);
  console.log(`  project            ${project.reference} — ${project.name}`);
  console.log(`  phases             ${phases}`);
  console.log(`  deliverables       ${deliverables}`);
  console.log(`  asset requests     ${assets}`);
  console.log(`  line items         ${lines}`);
  console.log(`  committed value    USD ${((agreed._sum.amountMinor ?? 0) / 100).toFixed(2)} (active + planned only)`);
  console.log(`  recurring lines    ${recurring} with a renewal date set`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
