// Client projects shown in the "Our work" section. Logos are stored
// locally under public/images/ so the site stays fast and self-contained.
// To swap a logo, drop the new file into public/images/ and update the
// `logo` path below.

export type Project = {
  title: string;
  category: string;
  description: string;
  domain: string;
  link: string;
  logo: string; // local path under /public
  logoBg: string; // brand-tinted viewport background
  accent: string; // CTA / accent color in the mockup
  highlights: string[]; // animated feature pills
  cta: string; // text on the fake CTA button in the mockup
  tech: string[];
};

export const projects: ReadonlyArray<Project> = [
  {
    title: 'Safari King Africa',
    category: 'Safari Booking Platform',
    description:
      "Full-stack booking platform for Tanzania's premier private-guided safari operator. Custom admin dashboard, dynamic package catalog, lead-capture forms, and automated email workflows.",
    domain: 'safarikingafrica.com',
    link: 'https://www.safarikingafrica.com/',
    logo: '/images/safari-king-logo.png',
    logoBg: '#FDF9ED',
    accent: '#C9A052',
    highlights: ['Booking Engine', 'Admin Dashboard', 'Package Catalog', 'Lead Capture'],
    cta: 'Plan Your Safari',
    tech: ['Next.js 16', 'PostgreSQL', 'Prisma', 'NextAuth', 'Resend'],
  },
  {
    title: 'Usambara Destination',
    category: 'Eco-Tourism Website',
    description:
      'Multi-page SEO-optimized website for an eco-tourism operator in the Usambara Mountains. Schema.org markup, blog engine, tour packages, and lightning-fast mobile experience.',
    domain: 'usambaradestination.com',
    link: 'https://www.usambaradestination.com/',
    logo: '/images/usambara-destination-logo.jpeg',
    logoBg: '#F1F6EE',
    accent: '#1F4D2A',
    highlights: ['SEO + Schema.org', 'Blog Engine', 'Tour Packages', 'Mobile-First'],
    cta: 'Explore Tours',
    tech: ['Static HTML', 'Performance', 'Schema.org', 'Mobile-First'],
  },
];
