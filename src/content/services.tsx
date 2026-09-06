// The six service pillars. Source of truth for the Services page and the
// homepage services section. Icons are lucide-react. Keep descriptions
// specific and grounded (see POSITIONING.md).
//
// The count is spelled out in two headings ("Six ways we help you grow" on the
// homepage and /build) and the /build hero lead — update those if you add or
// remove a pillar.

import {
  Code2,
  Server,
  Palette,
  BarChart3,
  Sparkles,
  Compass,
  type LucideIcon,
} from 'lucide-react';

export type ServiceKey = 'web' | 'hosting' | 'branding' | 'data' | 'ai' | 'strategy';

export type Service = {
  key: ServiceKey;
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
    title: 'Websites & Custom Platforms',
    summary: 'Public experiences and operational tools.',
    description:
      'We design and build mobile-first public websites, e-commerce, and custom web platforms, including content management, enquiry paths, and internal workflows. Performance, accessibility, and maintainable ownership are part of the build.',
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
    icon: Server,
    title: 'Hosting, Domains & Email',
    summary: 'Infrastructure with clear ownership.',
    description:
      'The infrastructure behind your website and apps, looked after as one system: managed hosting, domain registration and DNS, professional email, backups, certificates, and clear renewal ownership. The goal is fewer preventable outages and no ambiguity about who is watching what.',
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
    icon: Palette,
    title: 'Brand Identity & Design',
    summary: 'One identity carried through daily materials.',
    description:
      'A cohesive visual identity and the design work that carries it day to day: logo, brand identity and style guide, plus the banners, flyers, social posts, business cards and marketing collateral your business runs on, all in one consistent look.',
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
    icon: BarChart3,
    title: 'Data & Business Intelligence',
    summary: 'Reporting people can trust and act on.',
    description:
      'We organise the data you already rely on, define the measures that matter, and build dashboards and pipelines that keep reporting current and traceable.',
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
    title: 'AI & Automation',
    summary: 'Automation grounded in the work and source material.',
    description:
      'We build grounded assistants, predictive models, and automation for repetitive work when the use case justifies them. The system has to fit the workflow, source material, review process, and risk.',
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
    title: 'Technology Strategy & Advisory',
    summary: 'A clear technology decision and a workable path.',
    description:
      'We help you plan the digital side and build the capability to run it: transformation roadmaps, maturity assessment, training for your team, and ongoing advisory when the engagement calls for it.',
    items: [
      'Transformation roadmaps',
      'Digital maturity assessment',
      'Skills & training workshops',
      'Ongoing support & advisory',
      'System modernisation',
    ],
  },
];
