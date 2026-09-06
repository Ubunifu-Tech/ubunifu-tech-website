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
  'The gap we keep encountering is rarely a total lack of technology. It is a patchwork of tools, spreadsheets, messages, and manual work that does not quite match the workflow or the support reality around it.',
  'We started Ubunifu to work inside that gap. Consulting lets us understand specific organisations. Building products forces us to make those lessons reusable, dependable, and simple enough to operate. Each side makes the other sharper.',
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
    body: 'Practical technology work sized for Tanzanian organisations, with clear trade-offs and a path their teams can own.',
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
    body: 'Plan ownership beyond launch. When support is part of the engagement, we maintain and improve what we build while helping your team grow its own digital confidence.',
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
