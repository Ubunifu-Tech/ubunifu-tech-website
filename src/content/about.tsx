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
  'Most software was built for somewhere else. It assumes fast, constant internet, credit-card payments, English-first users, and budgets that fit a foreign price list. For a lot of organisations in Tanzania, that means working around the tool instead of with it.',
  'We started Ubunifu to close that gap. We bring serious engineering — cloud, data, modern AI, full-stack web — and pair it with a real read of how business actually runs here. We build the digital side, then we stay on to run it with you.',
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
    body: 'Digital transformation that organisations of every size can actually reach, not only those who can afford a foreign vendor.',
  },
  {
    icon: MapPin,
    title: 'Start from here',
    body: 'Build around the workflows, languages, connectivity, and payment realities that exist in Tanzania, rather than retrofitting tools from elsewhere.',
  },
  {
    icon: Cpu,
    title: 'Bring capability in-market',
    body: 'Put cloud, data, and modern AI to work locally, so this expertise lives in Tanzania and serves Tanzanian organisations.',
  },
  {
    icon: HeartHandshake,
    title: 'Build for the long term',
    body: 'Not launch-and-leave. We run, support, and grow what we build, and help your team build its own digital confidence.',
  },
];

export type ApproachStep = {
  title: string;
  body: string;
};

export const approach: ReadonlyArray<ApproachStep> = [
  {
    title: 'Listen first',
    body: 'We start from your reality — your workflows, your market, your constraints — not a template.',
  },
  {
    title: 'Scope honestly',
    body: 'A clear plan: timeline, deliverables, and pricing you can trust. We tell you what is realistic.',
  },
  {
    title: 'Build iteratively',
    body: 'Working software, shipped in steps, with you involved throughout. No big-bang surprises.',
  },
  {
    title: 'Run and evolve',
    body: 'We stay on to maintain, monitor, and improve it, so the solution keeps delivering as you grow.',
  },
];
