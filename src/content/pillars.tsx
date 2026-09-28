// The operating philosophy rendered on the homepage.
//
// These are not four independent features. They are one sequence — how we work
// before, during, and after a project — and the section's lead sets them as a
// single sentence, so `clause` must read grammatically in that list:
//
//   "We understand locally, ship real work, use AI deliberately, and stay
//    accountable after launch."
//
// THE PROOF LINES ARE EVIDENCE AND THEY MUST STAY TRUE. Each is a fact a visitor
// can go and check, and `href` is where they check it. Every line below is
// sourced from elsewhere in this repo:
//
//   local        products.tsx — Sifa's TZS records, Insight's Swahili tutor and
//                Tanzania-localised templates
//   shipped      portfolio.tsx — the two live client domains; products.tsx — the
//                two live products we operate
//   ai           portfolio.tsx — Safari King's admin assistant and its human
//                review step; products.tsx — answers with source references
//   accountable  about.tsx — we run our own products, and we document handover;
//                portfolio.tsx — hosting and server support
//
// Do not add a proof line the repo cannot source. Claims considered and REJECTED for
// lack of support are listed in `unclaimed` at the bottom of this file. If a claim
// is not checkable, leave it out.

export type PillarKey = 'local' | 'shipped' | 'ai' | 'accountable';

export type Pillar = {
  key: PillarKey;
  /** Reads as one clause inside the statement sentence. */
  clause: string;
  /** Column heading under the statement. */
  title: string;
  /** ONE checkable fact. Kept to a line: this sits in a ledger strip, not a card. */
  proof: string;
  /** Where a visitor can verify it. */
  href: string;
  linkLabel: string;
};

export const pillars: ReadonlyArray<Pillar> = [
  {
    key: 'local',
    clause: 'understand locally',
    title: 'Understand locally',
    proof: 'Sifa keeps records in Tanzanian shillings; Insight teaches in Swahili.',
    href: '/products',
    linkLabel: 'See the products',
  },
  {
    key: 'shipped',
    clause: 'ship real work',
    title: 'Ship real work',
    proof: 'Two client platforms are live, at safarikingafrica.com and usambaradestination.com.',
    href: '/work',
    linkLabel: 'See our work',
  },
  {
    key: 'ai',
    clause: 'use AI deliberately',
    title: 'Use AI deliberately',
    proof: 'Safari King’s assistant drafts itineraries; the team reviews and sends every one.',
    href: '/work/safari-king',
    linkLabel: 'Read the case study',
  },
  {
    key: 'accountable',
    clause: 'stay accountable after launch',
    title: 'Stay accountable',
    proof: 'We run Insight and Sifa ourselves, so we maintain software rather than only build it.',
    href: '/about',
    linkLabel: 'How we work',
  },
];

// Claims the site deliberately does not make, because nothing in the repo can
// source them. This is the one home for the list: the proof lines above must
// stay clear of it, and the website assistant reads it as NOT STATED, so it
// never makes these claims either and says the team can confirm instead. Take a
// claim off only once the site itself can show it.
export const unclaimed: ReadonlyArray<string> = [
  'That any product or project works offline or on a low-bandwidth connection',
  'Mobile money support, such as M-Pesa, in any product or project',
  'How many clients or projects we have had',
  'How many years we have been in business',
  'A headcount or team size beyond saying we are a small team',
  'Launch results or metrics for any project, such as traffic, sales or growth figures',
  'Hosting inside Tanzania for anything we build or run',
  'Having clients in any sector; the sectors are focus areas, not a client list',
  'That the phone number takes WhatsApp messages',
];
