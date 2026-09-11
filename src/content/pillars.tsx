// "Why Ubunifu" differentiators. Each is a real, defensible reason to work with
// us (see POSITIONING.md). Rendered by WhyUbunifu.tsx directly beneath the home
// hero. Two of the four make checkable claims — named client platforms, and the
// assistant in a client booking platform — so keep them true or cut them.

import { Globe, Wrench, BadgeCheck, Cpu, type LucideIcon } from 'lucide-react';

export type Pillar = {
  icon: LucideIcon;
  label: string;
  body: string;
};

export const pillars: ReadonlyArray<Pillar> = [
  {
    icon: Globe,
    label: 'Local and technical',
    body: 'Serious engineering with a real read of the Tanzanian market. Modern technology that is also practical to run here.',
  },
  {
    icon: BadgeCheck,
    label: 'Shipped, not imagined',
    body: 'We operate software products and have shipped named client platforms. You can inspect the work, not just a slide deck.',
  },
  {
    icon: Cpu,
    label: 'AI when it fits',
    body: 'Pragmatic AI that solves a specific problem, like the grounded assistant we built into a client booking platform.',
  },
  {
    icon: Wrench,
    label: 'Ownership after launch',
    body: 'Support, monitoring, iteration, or a clean handover are agreed explicitly, so ownership is clear after launch.',
  },
];
