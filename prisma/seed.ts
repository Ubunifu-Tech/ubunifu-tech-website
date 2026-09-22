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
import { PrismaClient, BillingKind, LineItemStatus, ServiceLine } from '../src/generated/prisma/client';

process.loadEnvFile('.env');

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
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

/**
 * One default template per service line. The phases differ because the work
 * does: branding ends at handover of files, hosting is a standing service with
 * no build, advisory ends in a report and a decision.
 */
const TEMPLATES: Array<{
  serviceLine: ServiceLine;
  name: string;
  description: string;
  phases: Array<{ name: string; goal: string; startDayOffset: number; endDayOffset: number; deliverables: string[] }>;
  assets: Array<{ title: string; detail?: string; category?: string }>;
}> = [
  {
    serviceLine: 'web',
    name: 'Website or platform build',
    description: 'Discovery, design, build, launch. The default for a public site or a custom platform.',
    phases: [
      {
        name: 'Initiation and brand kit',
        goal: 'Agree scope, secure the domain, and collect everything the build depends on.',
        startDayOffset: 0,
        endDayOffset: 6,
        deliverables: ['Kick-off call and agreed scope', 'Domain secured', 'Design kit and colour palette', 'Client assets collected'],
      },
      {
        name: 'Structure and design',
        goal: 'Wireframes, navigation and the core page templates.',
        startDayOffset: 7,
        endDayOffset: 16,
        deliverables: ['Wireframes and site navigation', 'Responsive homepage layout', 'Layout templates for inner pages', 'Design preview shared with client'],
      },
      {
        name: 'Content integration and build',
        goal: 'Real content in place and the site running on production infrastructure.',
        startDayOffset: 17,
        endDayOffset: 26,
        deliverables: ['Content and imagery integrated', 'Mobile performance pass', 'Hosting provisioned', 'Staging link shared with client'],
      },
      {
        name: 'Testing, review and launch',
        goal: 'Cross-device testing, client sign-off, and go live.',
        startDayOffset: 27,
        endDayOffset: 37,
        deliverables: ['Cross-device and browser testing', 'Client walkthrough and final edits', 'Domain connected and SSL active', 'Completion report and handover'],
      },
    ],
    assets: [
      { title: 'Logo assets', detail: 'High-resolution PNG with a transparent background, for light and dark headers.', category: 'Brand' },
      { title: 'Founder bio and story', detail: 'Short biography, background, and the inspiration behind the business.', category: 'Copy' },
      { title: 'Mission, vision and values', detail: 'Core purpose, future outlook, and the principles guiding the work.', category: 'Copy' },
      { title: 'Products or packages', detail: 'What you sell, broken down by category.', category: 'Copy' },
      { title: 'Media and imagery', detail: 'High-resolution photographs you own or are licensed to use.', category: 'Media' },
      { title: 'Contact details', detail: 'WhatsApp number, phone, email, physical location, social handles.', category: 'Contact' },
    ],
  },
  {
    serviceLine: 'hosting',
    name: 'Hosting, domains and email',
    description: 'A standing service rather than a build. Phases cover setup and the renewal cycle.',
    phases: [
      { name: 'Setup', goal: 'Register or transfer, provision, and verify.', startDayOffset: 0, endDayOffset: 5, deliverables: ['Domain registered or transferred', 'Hosting provisioned', 'Mailboxes created', 'DNS and SSL verified'] },
      { name: 'Handover', goal: 'The client knows what they have and who controls it.', startDayOffset: 6, endDayOffset: 10, deliverables: ['Access and ownership documented', 'Renewal dates recorded', 'Support route agreed'] },
    ],
    assets: [
      { title: 'Preferred domain name', detail: 'First and second choice.', category: 'Domain' },
      { title: 'Registrant details', detail: 'Legal name, address and contact for the registration record.', category: 'Domain' },
      { title: 'Mailbox list', detail: 'The addresses to create and who owns each.', category: 'Email' },
    ],
  },
  {
    serviceLine: 'branding',
    name: 'Brand identity and design',
    description: 'Discovery through to a delivered kit. No launch, no hosting.',
    phases: [
      { name: 'Discovery', goal: 'Understand the business, the audience and the competition.', startDayOffset: 0, endDayOffset: 7, deliverables: ['Discovery session', 'Positioning notes', 'Visual direction agreed'] },
      { name: 'Design', goal: 'Draft, review and settle the identity.', startDayOffset: 8, endDayOffset: 21, deliverables: ['Logo concepts', 'Selected route refined', 'Colour and type system'] },
      { name: 'Delivery', goal: 'Everything packaged so the client can use it without us.', startDayOffset: 22, endDayOffset: 28, deliverables: ['Brand guidelines', 'Logo files in all formats', 'Templates and collateral'] },
    ],
    assets: [
      { title: 'Existing brand material', detail: 'Anything currently in use, even if it is being replaced.', category: 'Brand' },
      { title: 'Audience description', detail: 'Who you are trying to reach.', category: 'Strategy' },
      { title: 'Reference examples', detail: 'Brands you admire, and why.', category: 'Strategy' },
    ],
  },
  {
    serviceLine: 'data',
    name: 'Data and business intelligence',
    description: 'Sources, model, dashboards, and the handover that makes them usable.',
    phases: [
      { name: 'Source review', goal: 'Find where the data actually lives and how good it is.', startDayOffset: 0, endDayOffset: 7, deliverables: ['Source inventory', 'Data quality assessment', 'Agreed metric definitions'] },
      { name: 'Model and pipeline', goal: 'Get the data somewhere it can be queried reliably.', startDayOffset: 8, endDayOffset: 21, deliverables: ['Data model', 'Ingestion or connection set up', 'Validation checks'] },
      { name: 'Dashboards and handover', goal: 'Reports the team can read and maintain.', startDayOffset: 22, endDayOffset: 32, deliverables: ['Dashboards built', 'Report walkthrough', 'Maintenance notes'] },
    ],
    assets: [
      { title: 'Data source access', detail: 'Credentials or exports for each system involved.', category: 'Access' },
      { title: 'Current reports', detail: 'Whatever the team uses today, including spreadsheets.', category: 'Context' },
      { title: 'Decisions to support', detail: 'What the team needs to be able to decide from this.', category: 'Context' },
    ],
  },
  {
    serviceLine: 'ai',
    name: 'AI and automation',
    description: 'Scoped around one workflow, with human review designed in from the start.',
    phases: [
      { name: 'Workflow scoping', goal: 'Pin down the task, its inputs, and what a good output looks like.', startDayOffset: 0, endDayOffset: 7, deliverables: ['Workflow documented', 'Success criteria agreed', 'Review step defined'] },
      { name: 'Build and evaluate', goal: 'Make it work, then find out how often it does.', startDayOffset: 8, endDayOffset: 24, deliverables: ['Prototype', 'Evaluation set', 'Accuracy and failure review'] },
      { name: 'Deploy and train', goal: 'In use, with the people who run it knowing its limits.', startDayOffset: 25, endDayOffset: 35, deliverables: ['Deployed to production', 'Team training', 'Limits and escalation documented'] },
    ],
    assets: [
      { title: 'Sample inputs', detail: 'Real documents or records the system will handle.', category: 'Data' },
      { title: 'Examples of good output', detail: 'What a person would produce for those inputs today.', category: 'Data' },
      { title: 'Reviewer', detail: 'Who checks the output before it is used.', category: 'People' },
    ],
  },
  {
    serviceLine: 'strategy',
    name: 'Technology strategy and advisory',
    description: 'Assessment through to a written recommendation and a decision.',
    phases: [
      { name: 'Assessment', goal: 'Understand the current systems and where they hurt.', startDayOffset: 0, endDayOffset: 10, deliverables: ['Stakeholder interviews', 'System inventory', 'Problem statement'] },
      { name: 'Options and recommendation', goal: 'Set out the routes with their costs and trade-offs.', startDayOffset: 11, endDayOffset: 21, deliverables: ['Options with costs', 'Written recommendation', 'Presentation to the team'] },
    ],
    assets: [
      { title: 'System list', detail: 'What the organisation runs on now, including spreadsheets and paper.', category: 'Context' },
      { title: 'Stakeholders', detail: 'Who should be interviewed.', category: 'People' },
      { title: 'Budget range', detail: 'What the organisation can realistically spend.', category: 'Context' },
    ],
  },
];

async function seedTemplates() {
  for (const t of TEMPLATES) {
    const template = await db.projectTemplate.upsert({
      where: { serviceLine_name: { serviceLine: t.serviceLine, name: t.name } },
      update: { description: t.description, isDefault: true },
      create: {
        serviceLine: t.serviceLine,
        name: t.name,
        description: t.description,
        isDefault: true,
      },
    });

    // Rebuild children so an edited template file is reflected exactly.
    await db.phaseTemplate.deleteMany({ where: { templateId: template.id } });
    await db.assetRequestTemplate.deleteMany({ where: { templateId: template.id } });

    for (const [i, phase] of t.phases.entries()) {
      await db.phaseTemplate.create({
        data: {
          templateId: template.id,
          name: phase.name,
          goal: phase.goal,
          position: i,
          startDayOffset: phase.startDayOffset,
          endDayOffset: phase.endDayOffset,
          deliverables: {
            create: phase.deliverables.map((title, j) => ({ title, position: j })),
          },
        },
      });
    }

    for (const [i, asset] of t.assets.entries()) {
      await db.assetRequestTemplate.create({
        data: {
          templateId: template.id,
          title: asset.title,
          detail: asset.detail,
          category: asset.category,
          position: i,
        },
      });
    }
  }
  return TEMPLATES.length;
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
  }> = [
    {
      label: 'Domain name',
      description: 'pekuatanzania.com annual registration',
      billingKind: 'recurring_annual',
      status: 'active',
      amount: usd(15),
      terms: 'To be secured on 21 September.',
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
    },
    {
      label: 'Professional email',
      description: 'Custom domain email setup',
      billingKind: 'recurring_monthly',
      status: 'deferred',
      amount: usd(10),
      terms: 'Deferred. $10/mo current estimate; exploring lower-cost solutions.',
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
      label: 'pekuatanzania.com',
      identifier: 'pekuatanzania.com',
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
  const templateCount = await seedTemplates();
  const { client, project } = await seedNifuate(owner.id);

  const [phases, deliverables, assets, lines] = await Promise.all([
    db.projectPhase.count({ where: { projectId: project.id } }),
    db.deliverable.count({ where: { phase: { projectId: project.id } } }),
    db.assetRequest.count({ where: { projectId: project.id } }),
    db.lineItem.count({ where: { projectId: project.id } }),
  ]);

  const agreed = await db.lineItem.aggregate({
    where: { projectId: project.id, status: { in: ['active', 'planned'] } },
    _sum: { amountMinor: true },
  });

  console.log('Seeded');
  console.log(`  staff owner        ${owner.email}`);
  console.log(`  project templates  ${templateCount} (one per service line)`);
  console.log(`  client             ${client.name}`);
  console.log(`  project            ${project.reference} — ${project.name}`);
  console.log(`  phases             ${phases}`);
  console.log(`  deliverables       ${deliverables}`);
  console.log(`  asset requests     ${assets}`);
  console.log(`  line items         ${lines}`);
  console.log(`  committed value    USD ${((agreed._sum.amountMinor ?? 0) / 100).toFixed(2)} (active + planned only)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
