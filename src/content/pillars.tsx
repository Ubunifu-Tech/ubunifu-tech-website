// The operating philosophy, rendered by WhyUbunifu.tsx beneath the home hero.
//
// These are not four independent features. They are one sequence — how we work
// before, during, and after a project — and the component sets them as a single
// sentence, so `clause` must read grammatically in the list:
//
//   "We understand locally, ship real work, use AI deliberately, and stay
//    accountable after launch."
//
// EVIDENCE IS THE POINT AND IT MUST STAY TRUE. Each `evidence` line is a fact a
// visitor can go and check, and `href` is where they check it. Every line below
// is sourced from elsewhere in this repo:
//
//   local        products.tsx — Sifa's TZS records, Insight's Swahili tutor
//   shipped      portfolio.tsx — the two live client domains
//   ai           portfolio.tsx — Safari King's admin assistant, human-reviewed
//   accountable  about.tsx — we run Insight and Sifa ourselves
//
// Do not add evidence that the repo cannot source. Claims that were considered
// and REJECTED for lack of support: offline/low-bandwidth capability, mobile
// money support, client or project counts, years in business, team size, launch
// metrics, in-country hosting, and sector coverage (sectors are focus areas, not
// existing clients). If a claim is not checkable, leave it out.

export type Pillar = {
  key: string;
  /** Reads as one clause inside the statement sentence. */
  clause: string;
  /** What the principle means in practice. */
  body: string;
  /** A checkable fact from our own work that backs the claim. */
  evidence: string;
  /** Where a visitor can verify that fact. */
  href: string;
  linkLabel: string;
};

export const pillars: ReadonlyArray<Pillar> = [
  {
    key: 'local',
    clause: 'understand locally',
    body: 'Serious engineering with a real read of the Tanzanian market, and technology that is practical to run here.',
    evidence:
      'Sifa keeps sales, stock and unpaid balances in Tanzanian shillings. Insight includes a tutor that teaches in Swahili.',
    href: '/products',
    linkLabel: 'See the products',
  },
  {
    key: 'shipped',
    clause: 'ship real work',
    body: 'We operate our own software and have shipped named client platforms. You can inspect the work, not a slide deck.',
    evidence:
      'Two client platforms are live and open to visit: safarikingafrica.com and usambaradestination.com.',
    href: '/work',
    linkLabel: 'See our work',
  },
  {
    key: 'ai',
    clause: 'use AI deliberately',
    body: 'AI goes in where it solves a specific problem, and the people using it stay in control of what it produces.',
    evidence:
      'Safari King’s admin assistant drafts itineraries and booking replies. The team reviews and sends every one.',
    href: '/work/safari-king',
    linkLabel: 'Read the case study',
  },
  {
    key: 'accountable',
    clause: 'stay accountable after launch',
    body: 'Support, monitoring, iteration, or a clean handover are agreed explicitly, so ownership is never ambiguous.',
    evidence:
      'We run Insight and Sifa ourselves, so we maintain software day to day rather than only building it.',
    href: '/about',
    linkLabel: 'How we work',
  },
];
