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
      'SEO & accessibility',
      'Performance & UX',
    ],
  },
  {
    key: 'hosting',
    icon: Server,
    title: 'Hosting, Domains & Email',
    summary: 'Keep your business online.',
    description:
      'The infrastructure that keeps you online, looked after end to end: fast, secure hosting for your website and apps, your domain registered and pointed where it should be, and professional email on your own domain. We set it up, keep it running, and stay on top of the renewals, so a lapsed domain or forgotten invoice never quietly takes your site or inbox offline.',
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
    title: 'Branding & Graphic Design',
    summary: 'A look that earns trust.',
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
