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
      'A professional presence, e-commerce, and the day-to-day tools to run sales, stock, and customers, with credit selling built in.',
    offerings: ['Websites & e-commerce', 'POS & inventory', 'Credit & customers', 'Sales analytics'],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Landmark,
    summary:
      'Analytics, customer tools, and secure digital channels for banks, SACCOs, and financial-service providers.',
    offerings: ['Data analytics', 'Customer portals', 'Secure channels', 'Reporting'],
  },
  {
    key: 'ngo',
    label: 'NGOs & Non-profits',
    icon: HeartHandshake,
    summary:
      'Impact dashboards, process automation, and communication platforms that make your work visible to funders and communities.',
    offerings: ['Impact dashboards', 'Process automation', 'Data management', 'Websites'],
  },
  {
    key: 'health',
    label: 'Healthcare',
    icon: Stethoscope,
    summary:
      'Patient and records systems, secure data handling, and health information tools, built with privacy in mind.',
    offerings: ['Records systems', 'Secure data', 'Reporting dashboards', 'Websites'],
  },
  {
    key: 'agriculture',
    label: 'Agriculture',
    icon: Sprout,
    summary:
      'Market-linkage and farm-management platforms, supply-chain tools, and analytics that help improve yields.',
    offerings: ['Market platforms', 'Farm management', 'Supply chain', 'Yield analytics'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: GraduationCap,
    summary:
      'E-learning, student management, and digital resources, including Swahili-first AI tutoring built on our own Insight platform.',
    offerings: ['E-learning', 'Student management', 'Swahili AI tutoring', 'Websites'],
  },
  {
    key: 'government',
    label: 'Government',
    icon: Building2,
    summary:
      'Citizen-facing services, data systems, and practical AI for public interaction and process efficiency.',
    offerings: ['Citizen portals', 'Data systems', 'Process automation', 'AI assistants'],
  },
];
