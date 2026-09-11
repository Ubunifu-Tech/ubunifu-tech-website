// Narrative content for the About page (vision, mission, objectives, the
// story, and how we work). Grounded in POSITIONING.md — no invented claims.

import {
  Eye,
  Compass,
  Accessibility,
  MapPin,
  Cpu,
  HeartHandshake,
  type LucideIcon,
} from 'lucide-react';

export const vision =
  'To be a leading force for digital innovation in Tanzania, helping organisations of every size adopt technology, make sense of their data, and raise the quality of how they work.';

export const mission =
  'To partner with Tanzanian organisations across every sector and deliver digital solutions that are technically strong, locally relevant, and practical to run, so technology becomes an advantage rather than an obstacle.';

export const visionMission = {
  vision: { icon: Eye as LucideIcon, label: 'Our vision', body: vision },
  mission: { icon: Compass as LucideIcon, label: 'Our mission', body: mission },
};

export const story: ReadonlyArray<string> = [
  'Our client work includes websites, booking systems, and business software. We help teams organise their information, reduce manual tasks, and manage the systems they use.',
  'Alongside client projects, we develop and operate our own products, including Ubunifu Insight and Ubunifu Sifa. That work gives us day-to-day experience of maintaining software after launch.',
];

export type Objective = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const objectives: ReadonlyArray<Objective> = [
  {
    icon: Accessibility,
    title: 'Make it accessible',
    body: 'Agree a scope and budget that suit the organisation, and make sure its team can use the result.',
  },
  {
    icon: MapPin,
    title: 'Understand the local context',
    body: 'Account for the languages, connectivity, payment methods, and working practices of the people using the system.',
  },
  {
    icon: Cpu,
    title: 'Share technical knowledge',
    body: 'Explain the options and train the people who will manage the system, so decisions do not depend on us alone.',
  },
  {
    icon: HeartHandshake,
    title: 'Build for the long term',
    body: 'Document the system, agree who owns it, and plan for maintenance. Ongoing support is included where agreed in the project scope.',
  },
];

export type ApproachStep = {
  title: string;
  body: string;
};

export const approach: ReadonlyArray<ApproachStep> = [
  {
    title: 'Listen first',
    body: 'We start from your workflows, market, constraints, and the people who will use or run the result.',
  },
  {
    title: 'Scope honestly',
    body: 'We make the timeline, deliverables, pricing, dependencies, and open decisions explicit before delivery begins.',
  },
  {
    title: 'Build iteratively',
    body: 'Working software, shipped in reviewable steps, with you involved throughout. Early feedback reduces late surprises.',
  },
  {
    title: 'Run and evolve',
    body: 'Where ongoing support is agreed, we maintain, monitor, and improve the system as needs change.',
  },
];
