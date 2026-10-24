// "Why we exist" / values cards on the About page. Icons are lucide-react.
// Aligned with the agency positioning in POSITIONING.md.

import { Globe, Wrench, Zap, Users, type LucideIcon } from 'lucide-react';

export type Value = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const values: ReadonlyArray<Value> = [
  {
    icon: Globe,
    title: 'Start from local conditions',
    body: 'We design around how people in Tanzania work, the languages they use, their internet connections and how they pay.',
  },
  {
    icon: Wrench,
    title: 'Plan beyond launch',
    body: 'For every project we agree what happens after launch: ongoing support, a documented handover, or both.',
  },
  {
    icon: Zap,
    title: 'Choose technology for the problem',
    body: 'Each technical choice has to solve part of the problem. We use AI and automation only when the work and the benefit justify them.',
  },
  {
    icon: Users,
    title: 'Review the work together',
    body: 'Your team sees working versions during the project, so questions and changes are dealt with before launch.',
  },
];
