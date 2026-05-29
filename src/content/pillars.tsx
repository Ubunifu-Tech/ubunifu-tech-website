// "Why Ubunifu" differentiators — the strip beneath the hero. Each is a real,
// defensible reason to work with us (see POSITIONING.md). Shape is kept as
// { icon, label, body } so the ProblemStrip component renders unchanged.

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
    label: 'Proven in production',
    body: 'We ship our own SaaS products and have built real client platforms. The work is live and in use, not slideware.',
  },
  {
    icon: Cpu,
    label: 'AI when it fits',
    body: 'Pragmatic AI that solves a specific problem, like the grounded assistant we built into a client booking platform.',
  },
  {
    icon: Wrench,
    label: 'We build and run it',
    body: 'We do not launch and leave. Maintenance, monitoring, and iteration are part of the partnership.',
  },
];
