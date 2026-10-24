// The six service pillars. Source of truth for the Services page and the
// homepage services section. Keep descriptions specific and grounded (see
// POSITIONING.md).

export type ServiceKey = 'web' | 'hosting' | 'branding' | 'data' | 'ai' | 'strategy';

export type Service = {
  key: ServiceKey;
  title: string;
  summary: string;
  description: string;
  items: string[];
};

export const services: ReadonlyArray<Service> = [
  {
    key: 'web',
    title: 'Websites & Custom Platforms',
    summary: 'Websites, online shops, and business applications.',
    description:
      'We build websites, online shops and custom applications that work on desktop and mobile. Your team can update the content, and we plan for speed, accessibility and search from the start.',
    items: [
      'Websites & web applications',
      'E-commerce',
      'CMS you control',
      'SEO & accessibility',
      'Performance & UX',
    ],
  },
  {
    key: 'hosting',
    title: 'Hosting, Domains & Email',
    summary: 'Hosting, renewals, backups, and support.',
    description:
      'We host your website and look after your domain and business email, including renewals, backups and recovery. We agree what we manage, who has access, and what happens when something breaks.',
    items: [
      'Website & app hosting',
      'Domain registration & DNS',
      'Professional email on your domain',
      'SSL certificates & backups',
      'Renewals & ongoing support',
    ],
  },
  {
    key: 'branding',
    title: 'Brand Identity & Design',
    summary: 'Logos, brand guidelines, and marketing materials.',
    description:
      'We design logos, visual identities, and marketing materials, with guidelines your team can use across print and digital.',
    items: [
      'Logo design & brand identity',
      'Banners, flyers & posters',
      'Social media graphics',
      'Business cards & stationery',
      'Marketing collateral & print',
      'UI/UX design',
    ],
  },
  {
    key: 'data',
    title: 'Data & Business Intelligence',
    summary: 'Connected data, dashboards, and reports.',
    description:
      'We turn your records into reports and dashboards that update automatically, so your team works from current figures.',
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
    title: 'AI & Automation',
    summary: 'Document assistants and task automation.',
    description:
      'We build predictive models, assistants that answer from your documents, and tools that handle repetitive tasks. We agree with you how the output is checked and where a person reviews it.',
    items: [
      'Custom AI and machine learning projects',
      'Assistants that answer from your documents',
      'Process automation',
      'Predictive analytics',
      'Human review and output checks',
    ],
  },
  {
    key: 'strategy',
    title: 'Technology Strategy & Advisory',
    summary: 'System assessments, upgrade plans, and training.',
    description:
      'We assess your current systems, compare options, and plan upgrades. We also train your team and provide ongoing technical advice.',
    items: [
      'Technology roadmaps',
      'Reviews of your current systems',
      'Training workshops',
      'Ongoing technical advice',
      'System upgrades',
    ],
  },
];
