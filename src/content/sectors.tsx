// Sectors we serve. Presented as focus areas / capability, NOT as a claim of
// existing clients in each (see POSITIONING.md). `proven` marks sectors where
// we have shipped real client work; used internally and, if surfaced, only to
// strengthen — never to overstate the others.

import {
  Plane,
  Store,
  Landmark,
  HeartHandshake,
  Stethoscope,
  Sprout,
  GraduationCap,
  Building2,
  type LucideIcon,
} from 'lucide-react';

export type Sector = {
  label: string;
  icon: LucideIcon;
  proven?: boolean;
};

export const sectors: ReadonlyArray<Sector> = [
  { label: 'Tourism & Hospitality', icon: Plane, proven: true },
  { label: 'SMEs & Retail', icon: Store },
  { label: 'Finance', icon: Landmark },
  { label: 'NGOs & Non-profits', icon: HeartHandshake },
  { label: 'Healthcare', icon: Stethoscope },
  { label: 'Agriculture', icon: Sprout },
  { label: 'Education', icon: GraduationCap },
  { label: 'Government', icon: Building2 },
];
