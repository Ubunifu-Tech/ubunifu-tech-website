// The five service pillars. Source of truth for the Services page and the
// homepage services section. Icons are lucide-react. Keep descriptions
// specific and grounded (see POSITIONING.md).

import {
  Code2,
  Palette,
  BarChart3,
  Sparkles,
  Compass,
  type LucideIcon,
} from 'lucide-react';

export type Service = {
  key: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  description: string;
  items: string[];
};

export const services: ReadonlyArray<Service> = [
  {
    key: 'web',
    icon: Code2,
    title: 'Digital Presence & Web',
    summary: 'Websites and web apps that work.',
    description:
      'Professional, fast, mobile-first websites and web applications, from informational sites to e-commerce and full custom platforms. Built to engage your audience and run reliably.',
    items: [
      'Websites & web applications',
      'E-commerce',
      'CMS you control',
      'Hosting & domain coordination',
      'Performance & UX',
    ],
  },
  {
    key: 'branding',
    icon: Palette,
    title: 'Branding & Visual Communication',
    summary: 'A look that earns trust.',
    description:
      'A cohesive visual identity and the materials that carry it, from logo and style guide to the marketing collateral and product interfaces that represent you.',
    items: [
      'Logo & visual identity',
      'Style guides',
      'Marketing collateral',
      'UI/UX design',
      'Social & print graphics',
    ],
  },
  {
    key: 'data',
    icon: BarChart3,
    title: 'Data Analytics & BI',
    summary: 'Turn your data into decisions.',
    description:
      'We help you turn raw data into decisions: cleaned and organised, the KPIs that matter surfaced, and the dashboards and pipelines that keep them live and trustworthy.',
    items: [
      'Analysis & reporting',
      'Dashboards & visualisation',
      'KPIs & metrics',
      'Data warehousing & ETL',
      'Analytical models',
    ],
  },
  {
    key: 'ai',
    icon: Sparkles,
    title: 'Intelligent Automation & AI',
    summary: 'AI that earns its place.',
    description:
      'We help you harness AI where it actually pays off: grounded assistants, predictive models, and automation for the repetitive work. Practical and responsible, deployed only where it solves a real problem, like the assistant we built into Safari King.',
    items: [
      'Custom AI / ML projects',
      'Grounded AI assistants',
      'Process automation',
      'Predictive analytics',
      'Responsible, value-first AI',
    ],
  },
  {
    key: 'strategy',
    icon: Compass,
    title: 'Digital Strategy & Consulting',
    summary: 'A plan, and the skills to run it.',
    description:
      'We help you plan the digital side and build the capability to run it: transformation roadmaps, maturity assessment, training for your team, and a partnership that continues long after launch.',
    items: [
      'Transformation roadmaps',
      'Digital maturity assessment',
      'Skills & training workshops',
      'Ongoing support & advisory',
      'System modernisation',
    ],
  },
];
