// "About" / values cards. Icons are lucide-react names - see
// https://lucide.dev/icons for available icons.

import { Globe, Zap, CreditCard, MapPin, type LucideIcon } from 'lucide-react';

export type Value = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const values: ReadonlyArray<Value> = [
  {
    icon: Globe,
    title: 'Built for Africa from the start',
    body: 'We do not adapt software built elsewhere. We start from the workflows, connectivity, and business models that exist here, and build around them.',
  },
  {
    icon: Zap,
    title: 'No unnecessary complexity',
    body: 'Our products do one thing well. We ship what solves the problem, not what looks impressive in a demo.',
  },
  {
    icon: CreditCard,
    title: 'Pricing that matches the market',
    body: 'Pay as you go, credit-based pricing. No annual contracts, no seat fees. If the product works for you, you will keep using it.',
  },
  {
    icon: MapPin,
    title: 'Tanzania-first, Africa-wide',
    body: 'We are based in Arusha. We build for the businesses we know, then expand across the continent as we grow.',
  },
];
