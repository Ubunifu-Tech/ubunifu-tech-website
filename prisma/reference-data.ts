/**
 * Reference data the console needs before it is useful: the standard terms
 * every agreement is signed under, and a starting plan for each service line.
 *
 * Shared by the local seed, which rebuilds it freely, and by the deploy, which
 * only ever adds what is missing (scripts/load-reference-data.mts). Nothing
 * here is client data.
 */

import type { BillingKind, PrismaClient, ServiceLine } from '../src/generated/prisma/client';

/**
 * One default template per service line. The phases differ because the work
 * does: branding ends at handover of files, hosting is a standing service with
 * no build, advisory ends in a report and a decision.
 */
export const TEMPLATES: Array<{
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

/**
 * Writes the templates.
 *
 * rebuild: true (the local seed) makes every template match this file
 * exactly, children and all. rebuild: false (the deploy) only creates the
 * templates that do not exist yet and leaves the rest alone, so a deploy can
 * never undo a change made in the console.
 */
export async function loadTemplates(
  db: PrismaClient,
  { rebuild }: { rebuild: boolean },
): Promise<number> {
  let written = 0;
  for (const t of TEMPLATES) {
    const existing = await db.projectTemplate.findUnique({
      where: { serviceLine_name: { serviceLine: t.serviceLine, name: t.name } },
      select: { id: true },
    });
    if (existing && !rebuild) continue;

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
    written += 1;
  }
  return written;
}

/**
 * Version 1 of the standard terms.
 *
 * DRAFT FOR REVIEW. These are written to be plain and fair, and they are not
 * legal advice: have them checked before the first contract goes out. Editing
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

Recurring charges (domains, hosting, mailboxes and maintenance) renew on the
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

/**
 * Publishes version 1 of the standard terms, only when no version exists.
 *
 * Once a version exists it is never rewritten from here: agreements are
 * signed against its exact text, and a new wording is a new version,
 * published from the console.
 */
export async function loadTerms(db: PrismaClient, { effectiveFrom }: { effectiveFrom: Date }) {
  const any = await db.termsVersion.findFirst({
    orderBy: { version: 'desc' },
    select: { version: true, title: true },
  });
  if (any) return { ...any, created: false };

  const created = await db.termsVersion.create({
    data: {
      version: 1,
      title: 'Standard terms of engagement',
      bodyMarkdown: TERMS_V1,
      isCurrent: true,
      effectiveFrom,
      publishedAt: new Date(),
    },
    select: { version: true, title: true },
  });
  return { ...created, created: true };
}

/** The products we build and sell ourselves, as the site describes them. */
const PRODUCTS = ['Insight', 'Sifa', 'Rafiki'];

/**
 * Adds the products, only when there are none at all. Once they exist they
 * are the console's to rename, add to or stop, and a deploy never puts back
 * a name somebody changed.
 */
export async function loadProducts(db: PrismaClient): Promise<number> {
  if ((await db.product.count()) > 0) return 0;
  const created = await db.product.createMany({
    data: PRODUCTS.map((name) => ({ name })),
    skipDuplicates: true,
  });
  return created.count;
}
