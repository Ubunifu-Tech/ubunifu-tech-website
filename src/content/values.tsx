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
    title: 'Start from Tanzanian realities',
    body: 'We build around the workflows, connectivity, languages, and payment realities that exist here.',
  },
  {
    icon: Wrench,
    title: 'Plan beyond launch',
    body: 'Every engagement defines what happens next: an agreed support relationship, a documented handover, or a mix of both.',
  },
  {
    icon: Zap,
    title: 'Use technology deliberately',
    body: 'Every technical choice has to solve a real part of the problem. AI and automation are included only when the workflow and value justify them.',
  },
  {
    icon: Users,
    title: 'Review the work together',
    body: 'Your team reviews working versions throughout the project, so we can address questions and make changes before launch.',
  },
];
