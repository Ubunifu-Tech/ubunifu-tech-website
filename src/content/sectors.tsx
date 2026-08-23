// Sectors we serve. Presented as focus areas / capability, NOT as a claim of
// existing clients in each (see POSITIONING.md). `proven` marks sectors where
// we have shipped real client work. `summary` and `offerings` give the
// per-sector depth used on the /industries page.

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
  key: string;
  label: string;
  icon: LucideIcon;
  proven?: boolean;
  summary: string;
  offerings: string[];
};

export const sectors: ReadonlyArray<Sector> = [
  {
    key: 'tourism',
    label: 'Tourism & Hospitality',
    icon: Plane,
    proven: true,
    summary:
      'Booking and enquiry platforms, marketing sites, and the systems behind them, for safari operators, tour companies, and hotels.',
    offerings: ['Booking & enquiry systems', 'Marketing sites', 'Itinerary tools', 'Reviews & CRM'],
  },
  {
    key: 'sme',
    label: 'SMEs & Retail',
    icon: Store,
    summary:
      'Potential use cases include a professional presence, e-commerce, and tools for sales, stock, customers, and credit workflows.',
    offerings: ['Websites & e-commerce', 'POS & inventory', 'Credit & customers', 'Sales analytics'],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Landmark,
    summary:
      'Potential use cases include analytics, reporting, and customer tools. Regulated work would be scoped with the required domain and compliance specialists.',
    offerings: ['Data analytics', 'Customer portals', 'Reporting', 'Workflow design'],
  },
  {
    key: 'ngo',
    label: 'NGOs & Non-profits',
    icon: HeartHandshake,
    summary:
      'Potential use cases include impact dashboards, process automation, data organisation, and communication platforms.',
    offerings: ['Impact dashboards', 'Process automation', 'Data management', 'Websites'],
  },
  {
    key: 'health',
    label: 'Healthcare',
    icon: Stethoscope,
    summary:
      'Potential use cases include public websites, reporting, and non-clinical administration. Patient or clinical systems require specialist privacy and health partners.',
    offerings: ['Public websites', 'Reporting dashboards', 'Admin workflows', 'Data planning'],
  },
  {
    key: 'agriculture',
    label: 'Agriculture',
    icon: Sprout,
    summary:
      'Potential use cases include market-linkage platforms, farm records, supply-chain tools, and operational analytics.',
    offerings: ['Market platforms', 'Farm management', 'Supply chain', 'Yield analytics'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: GraduationCap,
    summary:
      'Potential use cases include e-learning, student administration, and digital resources, informed by the Swahili-language tutor in Insight.',
    offerings: ['E-learning', 'Student management', 'Swahili AI tutoring', 'Websites'],
  },
  {
    key: 'government',
    label: 'Government',
    icon: Building2,
    summary:
      'Potential use cases include public information sites, service portals, data systems, and process design, with procurement and governance requirements scoped explicitly.',
    offerings: ['Citizen portals', 'Data systems', 'Process automation', 'AI assistants'],
  },
];
