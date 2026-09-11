// The operating philosophy, rendered by WhyUbunifu.tsx beneath the home hero.
//
// These are not four independent features. They are one sequence — how we work
// before, during, and after a project — and the section's lead sets them as a
// single sentence, so `clause` must read grammatically in that list:
//
//   "We understand locally, ship real work, use AI deliberately, and stay
//    accountable after launch."
//
// THE POINTS ARE EVIDENCE AND THEY MUST STAY TRUE. Each one is a fact a visitor
// can go and check, and `href` is where they check it. Every point below is
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
// Do not add a point the repo cannot source. Claims considered and REJECTED for
// lack of support: offline/low-bandwidth capability, mobile money support,
// client or project counts, years in business, team size, launch metrics,
// in-country hosting, and sector coverage (sectors are focus areas, not existing
// clients). If a claim is not checkable, leave it out.

import { BadgeCheck, Cpu, Globe, Wrench, type LucideIcon } from 'lucide-react';

export type Pillar = {
  key: string;
  icon: LucideIcon;
  /** Reads as one clause inside the lead sentence. */
  clause: string;
  /** Card heading. */
  title: string;
  /** What the principle means in practice. */
  body: string;
  /** Checkable facts that back the claim. */
  points: ReadonlyArray<string>;
  /** Where a visitor can verify them. */
  href: string;
  linkLabel: string;
};

export const pillars: ReadonlyArray<Pillar> = [
  {
    key: 'local',
    icon: Globe,
    clause: 'understand locally',
    title: 'Understand locally',
    body: 'Serious engineering with a real read of the Tanzanian market, and technology that is practical to run here.',
    points: [
      'Sifa keeps sales, stock, and balances in Tanzanian shillings',
      'Insight includes a tutor that teaches in Swahili',
      'Tanzania-localised document templates',
    ],
    href: '/products',
    linkLabel: 'See the products',
  },
  {
    key: 'shipped',
    icon: BadgeCheck,
    clause: 'ship real work',
    title: 'Ship real work',
    body: 'We operate our own software and have shipped named client platforms. You can inspect the work, not a slide deck.',
    points: [
      'Safari King Africa, live at safarikingafrica.com',
      'Usambara Destination, live at usambaradestination.com',
      'Insight and Sifa, built and run by us',
    ],
    href: '/work',
    linkLabel: 'See our work',
  },
  {
    key: 'ai',
    icon: Cpu,
    clause: 'use AI deliberately',
    title: 'Use AI deliberately',
    body: 'AI goes in where it solves a specific problem, and the people using it stay in control of what it produces.',
    points: [
      'An assistant drafting itineraries and booking replies',
      'Every draft reviewed and sent by the team',
      'Document answers carry their source references',
    ],
    href: '/work/safari-king',
    linkLabel: 'Read the case study',
  },
  {
    key: 'accountable',
    icon: Wrench,
    clause: 'stay accountable after launch',
    title: 'Stay accountable',
    body: 'Support, monitoring, iteration, or a clean handover are agreed explicitly, so ownership is never ambiguous.',
    points: [
      'We run Insight and Sifa day to day',
      'Hosting and server support where agreed',
      'Documented handover when you take it over',
    ],
    href: '/about',
    linkLabel: 'How we work',
  },
];
