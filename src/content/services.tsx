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
      'We build websites, online shops, and custom applications that work across desktop and mobile. Your team can manage the content, with performance, accessibility, and search visibility considered from the start.',
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
      'Keep your website, domain, and business email running with clear responsibility for maintenance, renewals, and recovery. We agree what is managed, who has access, and what happens when something needs attention.',
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
      'We bring your records into reports and dashboards, and automate the updates so your team can use current information.',
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
      'We build assistants that use your documents, predictive models, and tools for repetitive tasks. We agree how outputs will be checked and where human review is needed.',
    items: [
      'Custom AI / ML projects',
      'Grounded AI assistants',
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
      'Transformation roadmaps',
      'Digital maturity assessment',
      'Skills & training workshops',
      'Ongoing support & advisory',
      'System modernisation',
    ],
  },
];
