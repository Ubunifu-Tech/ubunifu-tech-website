// Questions people ask the website assistant often enough to answer the same
// way every time. They are rendered as COMMON QUESTIONS in its knowledge.
//
// EVERY ANSWER MUST BE SOURCED, the same rule as the proof lines in
// pillars.tsx. Each one restates something the site already says, and `source`
// names where, so a reviewer can check it. An answer the site cannot source
// needs Richard's sign-off first, recorded in `source`. Do not add what the
// site cannot back up; check `unclaimed` in pillars.tsx before writing one.

import { careers, careersIntro } from './careers';
import { replyPromise, site } from './site';

export type AssistantFaq = {
  question: string;
  answer: string;
  /** Where the answer comes from on the site, for whoever reviews it. */
  source: string;
};

export const faqs: ReadonlyArray<AssistantFaq> = [
  {
    question: 'How is a project priced?',
    answer:
      'Every project is scoped first. The budget, timeline and what each side provides are agreed in the Shape stage, before building starts, and a person prices it once the scope is clear.',
    source: 'process.ts (Shape); about.tsx approach (Scope honestly)',
  },
  {
    question: 'How long does a project take?',
    answer:
      'It depends on the scope. The timeline is agreed with you in the Shape stage, together with the budget and deliverables.',
    source: 'process.ts (Shape); about.tsx approach (Scope honestly)',
  },
  {
    question: 'Do you support a website or system after launch?',
    answer:
      'Yes, where it is agreed. Every project defines what happens after launch: an agreed support relationship, a documented handover, or a mix of both. Hosting and ongoing support are provided where agreed.',
    source: 'values.tsx (Plan beyond launch); process.ts (Operate); about.tsx approach (Run and evolve)',
  },
  {
    question: 'Can our team edit the website ourselves?',
    answer: 'Yes. Our website work includes a CMS you control, so your team can manage the content.',
    source: 'services.tsx (Websites & Custom Platforms: description and items)',
  },
  {
    question: 'Who owns the system you build?',
    answer:
      'Ownership is agreed as part of the project. We document the system and train the people who will manage it, so decisions do not depend on us alone.',
    source: 'about.tsx objectives (Build for the long term; Share technical knowledge)',
  },
  {
    question: 'Do you put AI into everything?',
    answer:
      'No. AI and automation are included only when the workflow and the value justify them, and we agree how outputs will be checked and where a person reviews them.',
    source: 'values.tsx (Use technology deliberately); services.tsx (AI & Automation)',
  },
  {
    question: 'How do clients pay?',
    answer: 'Invoices are in the client portal, and each one shows how to pay.',
    source: 'the client portal invoice pages; chat design signed off by Richard',
  },
  {
    question: 'How quickly do you reply?',
    answer: replyPromise,
    source: 'site.ts replyPromise',
  },
  {
    question: 'Are you hiring?',
    answer:
      careers.openRoles.length === 0
        ? `There are no open roles right now. ${careersIntro()}`
        : `We are hiring for: ${careers.openRoles.join(', ')}. Details are on the careers page.`,
    source: 'careers.ts',
  },
  {
    question: 'Where are you based?',
    answer: `In ${site.location}.`,
    source: 'site.ts location',
  },
];
