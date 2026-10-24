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
  'To help organisations of every size in Tanzania put technology and their own data to good use.';

export const mission =
  'To work with organisations across Tanzania, in any sector, and build systems that suit local conditions and are practical to run.';

export const visionMission = {
  vision: { icon: Eye as LucideIcon, label: 'Our vision', body: vision },
  mission: { icon: Compass as LucideIcon, label: 'Our mission', body: mission },
};

export const story: ReadonlyArray<string> = [
  'Our client work includes websites, booking systems and business software. We help teams organise their information, cut down manual work and look after the systems they use.',
  'We also build and run our own products. Ubunifu Sifa is live, and Ubunifu Rafiki is in development. Running Sifa means we maintain live software day to day.',
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
    body: 'Plan for the languages, connection quality, payment methods and working habits of the people who will use the system.',
  },
  {
    icon: Cpu,
    title: 'Share technical knowledge',
    body: 'Explain the options and train the people who will manage the system, so decisions do not depend on us alone.',
  },
  {
    icon: HeartHandshake,
    title: 'Build for the long term',
    body: 'Document the system, agree who owns it and plan for maintenance. We provide ongoing support where the project scope includes it.',
  },
];

export type ApproachStep = {
  title: string;
  body: string;
};

export const approach: ReadonlyArray<ApproachStep> = [
  {
    title: 'Listen first',
    body: 'We start with how you work, your market and constraints, and the people who will use or run the system.',
  },
  {
    title: 'Scope honestly',
    body: 'Before work starts, we write down the timeline, deliverables, price, dependencies and any decisions still open.',
  },
  {
    title: 'Build iteratively',
    body: 'We deliver working software in steps you can review, so you can give feedback early.',
  },
  {
    title: 'Run and evolve',
    body: 'Where ongoing support is agreed, we maintain and monitor the system and update it as your needs change.',
  },
];
