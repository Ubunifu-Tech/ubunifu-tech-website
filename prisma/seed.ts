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
  /**
   * The fee shape, deliberately without amounts.
   *
   * What a template knows is the structure of the money — that a build is split
   * into a deposit and a balance, that a domain renews every year, that model
   * usage is billed at cost. What it cannot know is the price, which is agreed
   * per client. Seeding a plausible-looking default would be worse than leaving
   * it blank, because a number that is already filled in is a number that gets
   * invoiced without being read. Zero has to be replaced.
   */
  lines: Array<{ label: string; description?: string; billingKind: BillingKind; terms?: string }>;
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
    lines: [
      { label: 'Deposit', billingKind: 'installment', terms: 'Half the agreed build fee, due at kick-off. Work starts once it is received.' },
      { label: 'Balance', billingKind: 'installment', terms: 'The remaining half, due at launch.' },
      { label: 'Domain registration', billingKind: 'recurring_annual', terms: 'Renews every year. Registered in the client’s name.' },
      { label: 'Hosting', billingKind: 'recurring_annual', terms: 'Renews every year. Covers hosting and SSL.' },
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
    lines: [
      { label: 'Setup and migration', billingKind: 'one_off', terms: 'One-off, due once the service is live and verified.' },
      { label: 'Domain registration', billingKind: 'recurring_annual', terms: 'Renews every year. Registered in the client’s name.' },
      { label: 'Hosting', billingKind: 'recurring_annual', terms: 'Renews every year. Covers hosting and SSL.' },
      { label: 'Business email', billingKind: 'recurring_annual', description: 'Priced per mailbox.', terms: 'Renews every year.' },
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
    lines: [
      { label: 'Deposit', billingKind: 'installment', terms: 'Half the agreed fee, due at kick-off.' },
      { label: 'Balance', billingKind: 'installment', terms: 'The remaining half, due when the files are handed over.' },
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
    lines: [
      { label: 'Deposit', billingKind: 'installment', terms: 'Half the agreed fee, due at kick-off.' },
      { label: 'Balance', billingKind: 'installment', terms: 'The remaining half, due at handover.' },
      { label: 'Dashboard hosting and support', billingKind: 'recurring_monthly', terms: 'Monthly, starting the month after handover. Optional.' },
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
    lines: [
      { label: 'Deposit', billingKind: 'installment', terms: 'Half the agreed fee, due at kick-off.' },
      { label: 'Balance', billingKind: 'installment', terms: 'The remaining half, due when the workflow is in production.' },
      { label: 'Model usage', billingKind: 'usage', description: 'What the provider charges to run the workflow.', terms: 'Billed monthly at cost, with the provider’s invoice attached.' },
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
    lines: [
      { label: 'Advisory fee', billingKind: 'one_off', terms: 'Due on delivery of the written recommendation.' },
      { label: 'Ongoing advisory', billingKind: 'recurring_monthly', terms: 'Optional. A monthly retainer once the engagement ends.' },
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
    await db.lineItemTemplate.deleteMany({ where: { templateId: template.id } });

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

    for (const [i, line] of t.lines.entries()) {
      await db.lineItemTemplate.create({
        data: {
          templateId: template.id,
          label: line.label,
          description: line.description,
          billingKind: line.billingKind,
          // amountMinor stays at its default of zero. See the note on the type.
          terms: line.terms,
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
    intervalMonths?: number;
    nextDueAt?: Date;
  }> = [
    {
      label: 'Domain name',
      description: 'pekuatanzania.com annual registration',
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


/**
 * Version 1 of the standard terms.
 *
 * DRAFT FOR REVIEW. These are written to be plain and fair, and they are not
 * legal advice — have them checked before the first contract goes out. Editing
 * them in the admin publishes version 2; contracts already signed stay pinned
 * to the version their signer accepted.
 */
const TERMS_V1 = `## 1. Who these terms are between

These terms apply between Ubunifu Technologies ("we", "us") and the client named
in the accompanying proposal or contract ("you"). The proposal sets out the
scope, price and dates. Where the proposal and these terms disagree, the
proposal wins.

## 2. What we will do

We will carry out the work described in the proposal with reasonable skill and
care. Where the proposal names phases and dates, we will keep you informed of
progress against them and tell you promptly if a date is at risk.

## 3. What we need from you

Delivery depends on material only you can provide: logos, copy, photographs,
access to systems, and decisions when we ask for them. The proposal lists what
we need and when. Dates move if that material arrives late, and we will tell you
when it does rather than absorbing the delay silently.

## 4. Payment

Fees, instalments and recurring charges are set out in the proposal. Invoices
are due within 14 days of issue unless the proposal says otherwise. Work may
pause on overdue invoices, and we will tell you before it does.

Recurring charges — domains, hosting, mailboxes, maintenance — renew on the
dates recorded in your portal. We raise a draft invoice ahead of each renewal
and send it to you for review; nothing renews without an invoice you have seen.

## 5. Ownership

On final payment, you own the deliverables produced for you, including designs,
content and custom code written specifically for your project. We keep ownership
of our own pre-existing tools, libraries and methods, and grant you a licence to
use them as part of the deliverables.

Third-party components keep their own licences. Domains and hosting accounts are
registered in your name wherever the provider allows it.

## 6. Our own work

We may describe the work publicly and show it in our portfolio, unless you ask
us in writing not to. We will not publish anything you have told us is
confidential.

## 7. Confidentiality

Each of us will keep the other's confidential information private and use it
only for this project.

## 8. Changes

Either of us can propose a change to the scope. A change that affects price or
dates is agreed in writing, as a change order, before the work is done.

## 9. Support after launch

Support and maintenance apply only where the proposal says so, for the period it
states. Outside that, support is quoted separately.

## 10. Liability

We are responsible for loss we cause by failing to meet these terms, up to the
total fees you have paid us for the project. We are not responsible for loss of
profit, loss of data you have not asked us to back up, or the failure of
third-party services outside our control. Nothing here limits liability that
cannot be limited by law.

## 11. Ending the engagement

Either of us may end the engagement in writing. You pay for work completed up to
that point. We will hand over completed deliverables and access we hold for you.

## 12. Governing law

These terms are governed by the laws of the United Republic of Tanzania.
`;

async function seedTerms() {
  return db.termsVersion.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      title: 'Standard terms of engagement',
      bodyMarkdown: TERMS_V1,
      isCurrent: true,
      effectiveFrom: d('2026-09-21'),
      publishedAt: new Date(),
    },
  });
}

async function main() {
  const owner = await seedStaff();
  const templateCount = await seedTemplates();
  const terms = await seedTerms();
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
