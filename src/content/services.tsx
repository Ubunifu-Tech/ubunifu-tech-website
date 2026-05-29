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
      'From cleaning and organising your data to dashboards, KPIs, and the pipelines behind them. We make the numbers that matter clear and actionable.',
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
      'Practical AI and automation for specific problems, not hype. Predictive models, process automation, and grounded AI assistants like the one we built into Safari King.',
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
      'Digital-transformation roadmaps, capacity building, and the ongoing partnership to keep it all moving, so the technology keeps delivering as you grow.',
    items: [
      'Transformation roadmaps',
      'Digital maturity assessment',
      'Skills & training workshops',
      'Ongoing support & advisory',
      'System modernisation',
    ],
  },
];
