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
    title: 'Built for Tanzania, not adapted',
    body: 'We start from the workflows, connectivity, languages, and payment realities that exist here, and build around them, rather than retrofitting tools made for somewhere else.',
  },
  {
    icon: Wrench,
    title: 'We build it, then we run it',
    body: 'We are not a launch-and-leave shop. Maintenance, monitoring, and steady improvement are part of the partnership, so your digital solutions keep delivering as you grow.',
  },
  {
    icon: Zap,
    title: 'Pragmatic, not flashy',
    body: 'We ship what solves the problem, not what looks impressive in a demo. AI and automation go in only where they genuinely earn their place.',
  },
  {
    icon: Users,
    title: 'One team, no handoffs',
    body: 'You work directly with the people who do the work. No account managers, no telephone game, just clear and honest communication.',
  },
];
