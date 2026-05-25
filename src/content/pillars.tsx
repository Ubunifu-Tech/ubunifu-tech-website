// Three-column strip beneath the hero. A snapshot of what we offer.

import { Box, Wrench, ArrowRight, type LucideIcon } from 'lucide-react';

export type Pillar = {
  icon: LucideIcon;
  label: string;
  body: string;
};

export const pillars: ReadonlyArray<Pillar> = [
  {
    icon: Box,
    label: 'Products',
    body: 'SaaS tools that solve real problems for African businesses — document AI, business management, and more on the way.',
  },
  {
    icon: Wrench,
    label: 'Consulting',
    body: 'Custom websites, data solutions, and digital strategy for businesses that need hands-on expertise.',
  },
  {
    icon: ArrowRight,
    label: 'Our approach',
    body: 'Everything starts from the workflows, pricing, and infrastructure that exist here — not adapted from elsewhere.',
  },
];
